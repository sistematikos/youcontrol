/**
 * YOU CONTROL - SISTEMATIKOS
 * Módulo Completo con Cálculos, Código de Barras y Departamentos
 */

import { db } from './firebase-config.js';
import { collection, onSnapshot, doc, getDoc, setDoc, getDocs, query } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const USER_ID = localStorage.getItem('youcontrol_empresa_id'); 

let productosLocales = [];
let listaTemporal = []; 
let tasaActual = 1.00;

// Vinculación DOM (Nombres exactos mantenidos)
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
const inputDepto = document.getElementById('comp-depto'); // Nuevo campo depto

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

        // Cargar productos
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

// 2. BUSCADOR INTELIGENTE
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

// Restauración de la lógica de ENTER
buscador.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        const criterio = buscador.value.trim();
        const prod = productosLocales.find(p => p.sku === criterio || p.barras === criterio);
        
        if (prod) {
            aviso.style.display = 'none';
            window.seleccionar(prod.sku);
            // Mover foco después de cargar el producto
            inputCantidad.focus(); 
        } else {
            // Si no existe, preparamos para nuevo registro
            aviso.style.display = 'block';
            inputSku.value = criterio;
            buscador.value = '';
            inputNombre.focus(); // Aquí es donde baja el cursor al Nombre
        }
    }
});

window.seleccionar = (sku) => {
    const prod = productosLocales.find(p => p.sku === sku);
    if (prod) {
        inputSku.value = prod.sku;
        inputBarras.value = prod.barras || '';
        inputNombre.value = prod.nombre;
        inputCosto.value = prod.costo || 0;
        inputGanancia.value = prod.ganancia || 0;
        inputPrecio.value = prod.precio || 0;
        inputDepto.value = prod.departamento || "GENERAL"; // Carga el depto
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

// 4. GESTIÓN DE LISTA
window.agregarALista = () => {
    const item = {
        sku: inputSku.value,
        barras: inputBarras.value,
        nombre: inputNombre.value,
        cant: parseInt(inputCantidad.value) || 0,
        precio: parseFloat(inputPrecio.value) || 0,
        costo: inputCosto.value, 
        ganancia: inputGanancia.value,
        departamento: inputDepto.value // Se guarda en el item
    };
    if (!item.sku || !item.nombre) return alert("Faltan datos");
    listaTemporal.push(item);
    renderizarTabla();
    limpiarFormulario();
};

function renderizarTabla() {
    const tbody = document.getElementById('tabla-items-compra');
    tbody.innerHTML = listaTemporal.map((item, i) => `
        <tr><td>${item.sku}</td><td>${item.nombre}</td><td>${item.cant}</td><td>$${item.precio}</td>
        <td><button onclick="listaTemporal.splice(${i},1); renderizarTabla()">X</button></td></tr>
    `).join('');
}

window.procesarIngresoMercancia = async () => {
    for (const item of listaTemporal) {
        const prodActual = productosLocales.find(p => p.sku === item.sku);
        await setDoc(doc(db, "usuarios", USER_ID, "productos", item.sku), {
            ...item,
            stock: (parseInt(prodActual?.stock) || 0) + item.cant
        }, { merge: true });
    }
    alert("Operación Exitosa");
    listaTemporal = [];
    renderizarTabla();
};

function limpiarFormulario() {
    inputSku.value = ''; 
    inputBarras.value = '';
    inputNombre.value = ''; 
    inputCantidad.value = '0';
    inputCosto.value = '0.00'; 
    inputPrecio.value = '0.00'; 
    inputPrecioBs.value = '';
    inputDepto.value = 'GENERAL';
    buscador.focus();
}
