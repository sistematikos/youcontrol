/**
 * YOU CONTROL - SISTEMATIKOS
 * Módulo Completo con Cálculos, Código de Barras, Departamentos y Proveedores
 */

import { db } from './firebase-config.js';
import { collection, onSnapshot, doc, getDoc, setDoc, getDocs, query, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const USER_ID = localStorage.getItem('youcontrol_empresa_id'); 

let productosLocales = [];
let proveedoresLocales = [];
let listaTemporal = []; 
let tasaActual = 1.00;
let proveedorSeleccionado = null;

// Vinculación DOM
const buscador = document.getElementById('buscador-dinamico');
const dropdown = document.getElementById('dropdown-resultados');
const aviso = document.getElementById('aviso-no-registrado');
const inputSku = document.getElementById('comp-sku');
const inputBarras = document.getElementById('comp-barras');
const inputNombre = document.getElementById('comp-nombre');
const inputCosto = document.getElementById('comp-costo');
const inputGanancia = document.getElementById('comp-ganancia');
const inputPrecio = document.getElementById('comp-precio');
const inputPrecioBs = document.getElementById('comp-precio-bs');
const inputCantidad = document.getElementById('comp-cantidad');
const inputDepto = document.getElementById('comp-depto');
const selectProveedor = document.getElementById('comp-proveedor');

// 1. INICIALIZACIÓN
async function cargarConfiguracion() {
    if (!USER_ID) return;
    try {
        // Cargar tasa
        const userSnap = await getDoc(doc(db, "usuarios", USER_ID));
        if (userSnap.exists()) {
            tasaActual = parseFloat(userSnap.data().tasa_bcv) || 1.00;
        }

        // Cargar Departamentos
        const snapDeptos = await getDocs(query(collection(db, "usuarios", USER_ID, "departamentos")));
        inputDepto.innerHTML = '<option value="GENERAL">GENERAL</option>';
        snapDeptos.forEach(d => {
            inputDepto.innerHTML += `<option value="${d.id}">${d.data().nombre.toUpperCase()}</option>`;
        });

        // Cargar Proveedores en tiempo real
        onSnapshot(collection(db, "usuarios", USER_ID, "proveedores"), (snapshot) => {
            proveedoresLocales = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            selectProveedor.innerHTML = '<option value="">-- Causal / General --</option>';
            proveedoresLocales.forEach(p => {
                selectProveedor.innerHTML += `<option value="${p.id}">${p.codigo || p.id} - ${p.nombre}</option>`;
            });
        });

        // Cargar Productos en tiempo real
        onSnapshot(collection(db, "usuarios", USER_ID, "productos"), (snapshot) => {
            productosLocales = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        });
    } catch (e) { console.error("Error al cargar:", e); }
}

window.evaluarMatematica = (valor) => {
    try {
        let entrada = valor.toString().replace(/[^0-9.+*%]/g, '');
        const regex = /(\d+(\.\d+)?)\s*\+\s*(\d+(\.\d+)?)\s*%/;
        const match = entrada.match(regex);
        if (match) {
            const base = parseFloat(match[1]);
            const porcentaje = parseFloat(match[3]);
            return base + (base * (porcentaje / 100));
        }
        return new Function('return ' + entrada.replace(/%/g, '/100'))();
    } catch (e) { return parseFloat(valor.replace(/[^0-9.]/g, '')) || 0; }
};

document.addEventListener('DOMContentLoaded', () => {
    cargarConfiguracion();
    
    inputCosto.addEventListener('blur', () => {
        const resultado = window.evaluarMatematica(inputCosto.value);
        inputCosto.value = resultado.toFixed(2);
        window.calcularPreciosCompra();
    });

    inputCosto.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const resultado = window.evaluarMatematica(inputCosto.value);
            inputCosto.value = resultado.toFixed(2);
            window.calcularPreciosCompra();
            inputGanancia.focus();
        }
    });

    inputCosto.addEventListener('input', window.calcularPreciosCompra);
    inputGanancia.addEventListener('input', window.calcularPreciosCompra);
    inputPrecio.addEventListener('input', window.calcularGananciaCompra);
});

// Selección de Proveedor
window.seleccionarProveedor = (id) => {
    const infoDiv = document.getElementById('info-proveedor');
    if (!id) {
        proveedorSeleccionado = null;
        infoDiv.style.display = 'none';
        return;
    }

    const prov = proveedoresLocales.find(p => p.id === id);
    if (prov) {
        proveedorSeleccionado = prov;
        document.getElementById('prov-info-rif').innerText = prov.rif || 'N/A';
        document.getElementById('prov-info-contacto').innerText = prov.contacto || 'N/A';
        infoDiv.style.display = 'block';
    }
};

// 2. BUSCADOR INTELIGENTE DE PRODUCTOS
buscador.addEventListener('input', (e) => {
    const val = e.target.value.toLowerCase().trim();
    if (!val) { dropdown.style.display = 'none'; aviso.style.display = 'none'; return; }
    
    const filtrados = productosLocales.filter(p => 
        (p.sku && String(p.sku).toLowerCase().includes(val)) || 
        (p.barras && String(p.barras).toLowerCase().includes(val)) || 
        (p.nombre && String(p.nombre).toLowerCase().includes(val))
    );
    
    if (filtrados.length > 0) {
        aviso.style.display = 'none';
        dropdown.innerHTML = filtrados.map(p => `
            <div class="search-item" style="padding:10px; cursor:pointer; border-bottom:1px solid #eee; background:white;" 
                 onclick="window.seleccionar('${p.sku}')">
                <strong>${p.nombre}</strong><br>
                <small>SKU: ${p.sku} | Depto: ${p.departamento || 'GENERAL'}</small>
            </div>
        `).join('');
        dropdown.style.display = 'block';
    } else {
        dropdown.style.display = 'none';
        aviso.style.display = 'block'; 
    }
});

// Tecla Enter en el Buscador
buscador.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        const criterio = buscador.value.trim();
        const prod = productosLocales.find(p => p.sku === criterio || p.barras === criterio);
        
        if (prod) {
            aviso.style.display = 'none';
            window.seleccionar(prod.sku);
            inputCantidad.focus(); 
        } else {
            aviso.style.display = 'block';
            inputSku.value = criterio.toUpperCase();
            buscador.value = '';
            inputNombre.focus();
        }
    }
});

window.seleccionar = (sku) => {
    const prod = productosLocales.find(p => p.sku === sku);
    if (prod) {
        inputSku.value = prod.sku;
        inputBarras.value = prod.barras || '';
        inputNombre.value = prod.nombre;
        inputCosto.value = (prod.costo || 0).toFixed(2);
        inputGanancia.value = prod.ganancia || 0;
        inputPrecio.value = (prod.precio || 0).toFixed(2);
        inputDepto.value = prod.departamento || "GENERAL";
        aviso.style.display = 'none';
        dropdown.style.display = 'none';
        window.calcularPreciosCompra();
    }
};

// 3. MATEMÁTICA Y CÁLCULOS
window.calcularPreciosCompra = () => {
    const c = parseFloat(inputCosto.value) || 0;
    const g = parseFloat(inputGanancia.value) || 0;
    const p = c + (c * (g / 100));
    inputPrecio.value = p.toFixed(2);
    inputPrecioBs.value = (p * tasaActual).toFixed(2).replace('.', ',') + " Bs.";
};

window.calcularGananciaCompra = () => {
    const c = parseFloat(inputCosto.value) || 0;
    const p = parseFloat(inputPrecio.value) || 0;
    if (c > 0) {
        inputGanancia.value = (((p - c) / c) * 100).toFixed(1);
    }
    inputPrecioBs.value = (p * tasaActual).toFixed(2).replace('.', ',') + " Bs.";
};

// 4. GESTIÓN DE LISTA DE COMPRA
window.agregarALista = () => {
    const item = {
        sku: inputSku.value.trim().toUpperCase(),
        barras: inputBarras.value.trim(),
        nombre: inputNombre.value.trim().toUpperCase(),
        cant: parseInt(inputCantidad.value) || 0,
        costo: parseFloat(inputCosto.value) || 0, 
        ganancia: parseFloat(inputGanancia.value) || 0,
        precio: parseFloat(inputPrecio.value) || 0,
        departamento: inputDepto.value
    };

    if (!item.sku || !item.nombre) return alert("Por favor complete los campos requeridos (SKU y Nombre).");
    if (item.cant <= 0) return alert("Ingrese una cantidad válida mayor a cero.");

    listaTemporal.push(item);
    renderizarTabla();
    limpiarFormulario();
};

function renderizarTabla() {
    const tbody = document.getElementById('tabla-items-compra');
    if (listaTemporal.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #94A3B8; padding: 15px;">No hay productos agregados a la lista.</td></tr>`;
        document.getElementById('total-compra-monto').innerText = "$0.00";
        return;
    }

    let total = 0;
    tbody.innerHTML = listaTemporal.map((item, i) => {
        const subtotal = item.cant * item.costo;
        total += subtotal;
        return `
            <tr style="border-bottom: 1px solid #F1F5F9;">
                <td style="padding:8px; font-weight:700;">${item.sku}</td>
                <td>${item.nombre}</td>
                <td>${item.cant}</td>
                <td>$${item.costo.toFixed(2)}</td>
                <td>$${item.precio.toFixed(2)}</td>
                <td style="text-align: center;">
                    <button onclick="window.eliminarItem(${i})" style="background:#FFE4E6; color:#F43F5E; border:none; padding:4px 8px; border-radius:4px; cursor:pointer;"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `;
    }).join('');

    document.getElementById('total-compra-monto').innerText = `$${total.toFixed(2)}`;
}

window.eliminarItem = (index) => {
    listaTemporal.splice(index, 1);
    renderizarTabla();
};

// 5. PROCESAR COMPRA Y REGISTRAR EN FIRESTORE
window.procesarIngresoMercancia = async () => {
    if (listaTemporal.length === 0) return alert("La lista de compra está vacía.");
    if (!USER_ID) return alert("Error de sesión o licencia activa.");

    if (!confirm(`¿Desea guardar la compra de ${listaTemporal.length} producto(s)?`)) return;

    try {
        const idCompra = "COMP-" + Date.now();
        const totalCompra = listaTemporal.reduce((acc, item) => acc + (item.cant * item.costo), 0);

        // 1. Registrar documento histórico de Compra
        await setDoc(doc(db, "usuarios", USER_ID, "compras", idCompra), {
            idCompra: idCompra,
            proveedorId: proveedorSeleccionado ? proveedorSeleccionado.id : "GENERAL",
            proveedorNombre: proveedorSeleccionado ? proveedorSeleccionado.nombre : "PROVEEDOR CASUAL",
            total: totalCompra,
            items: listaTemporal,
            fecha: serverTimestamp()
        });

        // 2. Actualizar o crear stock y costos de los productos
        for (const item of listaTemporal) {
            const prodActual = productosLocales.find(p => p.sku === item.sku);
            const stockAnterior = parseInt(prodActual?.stock) || 0;

            await setDoc(doc(db, "usuarios", USER_ID, "productos", item.sku), {
                sku: item.sku,
                barras: item.barras,
                nombre: item.nombre,
                costo: item.costo,
                ganancia: item.ganancia,
                precio: item.precio,
                departamento: item.departamento,
                stock: stockAnterior + item.cant,
                updatedAt: serverTimestamp()
            }, { merge: true });
        }

        alert("✅ Compra y actualización de inventario realizadas con éxito.");
        listaTemporal = [];
        renderizarTabla();
    } catch (e) {
        console.error("Error al procesar el ingreso:", e);
        alert("❌ Error al guardar la compra: " + e.message);
    }
};

function limpiarFormulario() {
    inputSku.value = ''; 
    inputBarras.value = '';
    inputNombre.value = ''; 
    inputCantidad.value = '0';
    inputCosto.value = '0.00'; 
    inputGanancia.value = '0';
    inputPrecio.value = '0.00'; 
    inputPrecioBs.value = '';
    inputDepto.value = 'GENERAL';
    buscador.value = '';
    aviso.style.display = 'none';
    dropdown.style.display = 'none';
    buscador.focus();
}
