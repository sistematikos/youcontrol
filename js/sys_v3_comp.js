// js/sys_v3_comp.js
import { db } from './firebase-config.js';
import { collection, getDocs, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let productosCache = []; // Almacén local temporal para filtrar rápido sin recargar Firestore a cada rato
let listaCompraTemporal = []; // Lista temporal de productos añadidos

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Cargar proveedores y productos desde Firestore al iniciar
    await cargarProveedoresFirestore();
    await cargarProductosFirestore();

    const buscador = document.getElementById('buscador-dinamico');
    const dropdown = document.getElementById('dropdown-resultados');
    const selectProveedor = document.getElementById('comp-proveedor');
    const btnAgregar = document.getElementById('btn-agregar-lista');
    const btnRegistrar = document.getElementById('btn-registrar-compra');

    // 2. CONFIGURAR SELECTOR DE PROVEEDORES
    if (selectProveedor) {
        selectProveedor.addEventListener('change', (e) => {
            manejarSeleccionProveedor(e.target.value);
        });
    }

    // 3. ACTIVAR CÁLCULOS AUTOMÁTICOS DE PRECIOS Y BS
    inicializarCalculosPrecios();

    // 4. EVENTO BOTÓN AGREGAR A LA LISTA
    if (btnAgregar) {
        btnAgregar.addEventListener('click', (e) => {
            e.preventDefault();
            agregarItemALista();
        });
    }

    // 5. EVENTO BOTÓN REGISTRAR / GUARDAR
    if (btnRegistrar) {
        btnRegistrar.addEventListener('click', async (e) => {
            e.preventDefault();
            await registrarCompraFirestore();
        });
    }

    // Si no existen los elementos del buscador de productos, salimos de esta sección sin romper el resto
    if (!buscador || !dropdown) return;

    // 6. BÚSQUEDA DE PRODUCTOS EN TIEMPO REAL
    buscador.addEventListener('input', (e) => {
        const query = e.target.value.trim().toLowerCase();

        if (query.length === 0) {
            dropdown.style.display = 'none';
            dropdown.innerHTML = '';
            return;
        }

        const resultados = productosCache.filter(p => {
            const sku = (p.sku || p.codigo || p.id || '').toString().toLowerCase();
            const nombre = (p.nombre || p.descripcion || '').toString().toLowerCase();
            return sku.includes(query) || nombre.includes(query);
        });

        renderizarResultados(resultados);
    });

    function renderizarResultados(lista) {
        dropdown.innerHTML = '';

        if (lista.length === 0) {
            dropdown.innerHTML = '<div style="padding: 10px; font-size: 0.8rem; color: var(--rose);">Producto no registrado</div>';
            dropdown.style.display = 'block';
            
            const aviso = document.getElementById('aviso-no-registrado');
            if (aviso) aviso.style.display = 'block';
            return;
        }

        const aviso = document.getElementById('aviso-no-registrado');
        if (aviso) aviso.style.display = 'none';

        lista.forEach(prod => {
            const item = document.createElement('div');
            item.className = 'dropdown-item';
            
            const skuTxt = prod.sku || prod.codigo || prod.id || 'S/N';
            const nombreTxt = prod.nombre || prod.descripcion || 'Sin Nombre';

            item.innerHTML = `<strong>${skuTxt}</strong> - ${nombreTxt}`;
            item.dataset.producto = JSON.stringify(prod);

            dropdown.appendChild(item);
        });

        dropdown.style.display = 'block';
    }

    // 7. SELECCIÓN DE PRODUCTO DESDE EL DROPDOWN
    dropdown.addEventListener('mousedown', (e) => {
        const item = e.target.closest('.dropdown-item');
        if (!item || !item.dataset.producto) return;

        e.preventDefault();
        const prod = JSON.parse(item.dataset.producto);
        seleccionarProducto(prod);
    });

    function seleccionarProducto(prod) {
        const skuInput = document.getElementById('comp-sku');
        const nombreInput = document.getElementById('comp-nombre');
        const costoInput = document.getElementById('comp-costo');
        const gananciaInput = document.getElementById('comp-ganancia');
        const precioInput = document.getElementById('comp-precio');
        const cantidadInput = document.getElementById('comp-cantidad');

        if (skuInput) skuInput.value = prod.sku || prod.codigo || prod.id || '';
        if (nombreInput) nombreInput.value = prod.nombre || prod.descripcion || '';
        if (costoInput) costoInput.value = prod.costo || prod.precioCosto || '0.00';
        if (gananciaInput) gananciaInput.value = prod.ganancia || prod.porcentajeGanancia || '0';
        if (precioInput) precioInput.value = prod.precio || prod.precioVenta || '0.00';

        calcularPrecioVenta(); // Recalcular con los nuevos valores y su conversión a Bs

        dropdown.style.display = 'none';
        buscador.value = `${prod.sku || prod.codigo || prod.id || ''} - ${prod.nombre || prod.descripcion || ''}`;

        const aviso = document.getElementById('aviso-no-registrado');
        if (aviso) aviso.style.display = 'none';

        if (cantidadInput) {
            cantidadInput.value = '1';
            cantidadInput.focus();
            cantidadInput.select();
        }
    }

    document.addEventListener('click', (e) => {
        if (!buscador.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.style.display = 'none';
        }
    });
});

// ==========================================
// SECCIÓN: CÁLCULOS DE PRECIOS Y TASA BCV
// ==========================================
function inicializarCalculosPrecios() {
    const costoInput = document.getElementById('comp-costo');
    const gananciaInput = document.getElementById('comp-ganancia');
    const precioInput = document.getElementById('comp-precio');

    if (costoInput) costoInput.addEventListener('input', calcularPrecioVenta);
    if (gananciaInput) gananciaInput.addEventListener('input', calcularPrecioVenta);
    if (precioInput) precioInput.addEventListener('input', calcularPorcentajeGanancia);
}

function calcularPrecioVenta() {
    const costo = parseFloat(document.getElementById('comp-costo')?.value) || 0;
    const ganancia = parseFloat(document.getElementById('comp-ganancia')?.value) || 0;
    const precioInput = document.getElementById('comp-precio');
    const precioBsInput = document.getElementById('comp-precio-bs');

    // Fórmula: Precio Venta = Costo + (Costo * (% Ganancia / 100))
    const precioVenta = costo + (costo * (ganancia / 100));

    if (precioInput) {
        precioInput.value = precioVenta.toFixed(2);
    }

    // Cálculo del precio en Bolívares usando la tasa almacenada en localStorage
    const tasaCambio = parseFloat(localStorage.getItem('sys_tasa_bcv')) || 1;
    if (precioBsInput) {
        const totalBs = precioVenta * tasaCambio;
        if (precioBsInput.tagName === 'INPUT' || precioBsInput.tagName === 'TEXTAREA') {
            precioBsInput.value = totalBs.toFixed(2);
        } else {
            precioBsInput.textContent = totalBs.toFixed(2) + ' Bs.';
        }
    }
}

function calcularPorcentajeGanancia() {
    const costo = parseFloat(document.getElementById('comp-costo')?.value) || 0;
    const precioVenta = parseFloat(document.getElementById('comp-precio')?.value) || 0;
    const gananciaInput = document.getElementById('comp-ganancia');
    const precioBsInput = document.getElementById('comp-precio-bs');

    if (costo > 0) {
        const ganancia = ((precioVenta - costo) / costo) * 100;
        if (gananciaInput) {
            gananciaInput.value = ganancia.toFixed(2);
        }
    }

    const tasaCambio = parseFloat(localStorage.getItem('sys_tasa_bcv')) || 1;
    if (precioBsInput) {
        const totalBs = precioVenta * tasaCambio;
        if (precioBsInput.tagName === 'INPUT' || precioBsInput.tagName === 'TEXTAREA') {
            precioBsInput.value = totalBs.toFixed(2);
        } else {
            precioBsInput.textContent = totalBs.toFixed(2) + ' Bs.';
        }
    }
}

// ==========================================
// SECCIÓN: AGREGAR A LISTA Y REGISTRAR
// ==========================================
function agregarItemALista() {
    const sku = document.getElementById('comp-sku')?.value || '';
    const nombre = document.getElementById('comp-nombre')?.value || '';
    const costo = parseFloat(document.getElementById('comp-costo')?.value) || 0;
    const ganancia = parseFloat(document.getElementById('comp-ganancia')?.value) || 0;
    const precio = parseFloat(document.getElementById('comp-precio')?.value) || 0;
    const cantidad = parseInt(document.getElementById('comp-cantidad')?.value) || 1;

    if (!nombre || costo <= 0) {
        alert("Por favor selecciona un producto válido e indica un costo mayor a 0.");
        return;
    }

    const item = {
        sku,
        nombre,
        costo,
        ganancia,
        precio,
        cantidad,
        subtotal: costo * cantidad
    };

    listaCompraTemporal.push(item);
    renderizarTablaTemporal();
    limpiarFormularioItem();
}

function renderizarTablaTemporal() {
    const contenedorTabla = document.getElementById('tabla-detalle-compra') || document.getElementById('lista-items-container');
    if (!contenedorTabla) return;

    let html = '';
    let totalGeneral = 0;

    listaCompraTemporal.forEach((prod, index) => {
        totalGeneral += prod.subtotal;
        html += `
            <tr>
                <td>${prod.sku || 'S/N'}</td>
                <td>${prod.nombre}</td>
                <td>${prod.cantidad}</td>
                <td>$${prod.costo.toFixed(2)}</td>
                <td>$${prod.subtotal.toFixed(2)}</td>
                <td><button type="button" onclick="eliminarItemTemporal(${index})" style="color:var(--rose); background:none; border:none; cursor:pointer;">❌</button></td>
            </tr>
        `;
    });

    if (contenedorTabla.tagName === 'TBODY') {
        contenedorTabla.innerHTML = html;
    }

    const labelTotal = document.getElementById('label-total-compra');
    if (labelTotal) labelTotal.textContent = `$${totalGeneral.toFixed(2)}`;
}

window.eliminarItemTemporal = function(index) {
    listaCompraTemporal.splice(index, 1);
    renderizarTablaTemporal();
}

function limpiarFormularioItem() {
    const buscador = document.getElementById('buscador-dinamico');
    const skuInput = document.getElementById('comp-sku');
    const nombreInput = document.getElementById('comp-nombre');
    const costoInput = document.getElementById('comp-costo');
    const gananciaInput = document.getElementById('comp-ganancia');
    const precioInput = document.getElementById('comp-precio');
    const cantidadInput = document.getElementById('comp-cantidad');
    const precioBsInput = document.getElementById('comp-precio-bs');

    if (buscador) buscador.value = '';
    if (skuInput) skuInput.value = '';
    if (nombreInput) nombreInput.value = '';
    if (costoInput) costoInput.value = '';
    if (gananciaInput) gananciaInput.value = '';
    if (precioInput) precioInput.value = '';
    if (cantidadInput) cantidadInput.value = '1';
    if (precioBsInput) {
        if (precioBsInput.tagName === 'INPUT') precioBsInput.value = '';
        else precioBsInput.textContent = '0.00 Bs.';
    }
    if (buscador) buscador.focus();
}

async function registrarCompraFirestore() {
    const empresaId = localStorage.getItem('youcontrol_empresa_id');
    const proveedorId = document.getElementById('comp-proveedor')?.value || 'casual';

    if (!empresaId) {
        alert("Error: No se encontró la empresa activa en la sesión.");
        return;
    }

    if (listaCompraTemporal.length === 0) {
        alert("La lista de compra está vacía. Agrega al menos un producto.");
        return;
    }

    try {
        const datosCompra = {
            proveedorId,
            items: listaCompraTemporal,
            fecha: new Date().toISOString(),
            total: listaCompraTemporal.reduce((acc, curr) => acc + curr.subtotal, 0)
        };

        await addDoc(collection(db, "usuarios", empresaId, "compras"), datosCompra);

        alert("¡Compra registrada y guardada con éxito en Firestore!");
        listaCompraTemporal = [];
        renderizarTablaTemporal();
        limpiarFormularioItem();

    } catch (error) {
        console.error("Error al registrar la compra:", error);
        alert("Hubo un error al guardar la compra en la base de datos.");
    }
}

// ==========================================
// SECCIÓN: CARGAS INICIALES DE DATOS
// ==========================================
async function cargarProveedoresFirestore() {
    const selectProveedor = document.getElementById('comp-proveedor');
    if (!selectProveedor) return;

    try {
        const empresaId = localStorage.getItem('youcontrol_empresa_id');
        if (!empresaId) return;

        const querySnapshot = await getDocs(collection(db, "usuarios", empresaId, "proveedores"));
        
        selectProveedor.innerHTML = '<option value="">-- Casual / General --</option>';

        querySnapshot.forEach((docSnap) => {
            const prov = docSnap.data();
            const provId = docSnap.id;

            const opt = document.createElement('option');
            opt.value = provId;
            opt.textContent = prov.nombre || prov.empresa || provId;
            opt.dataset.proveedor = JSON.stringify({ id: provId, ...prov });
            
            selectProveedor.appendChild(opt);
        });

    } catch (error) {
        console.error("Error al cargar proveedores:", error);
    }
}

async function cargarProductosFirestore() {
    try {
        const empresaId = localStorage.getItem('youcontrol_empresa_id');
        if (!empresaId) return;

        const querySnapshot = await getDocs(collection(db, "usuarios", empresaId, "productos"));
        
        productosCache = [];
        querySnapshot.forEach((docSnap) => {
            productosCache.push({ id: docSnap.id, ...docSnap.data() });
        });

    } catch (error) {
        console.error("Error al cargar productos de Firestore:", error);
        productosCache = JSON.parse(localStorage.getItem('sys_productos')) || [];
    }
}

function manejarSeleccionProveedor(valor) {
    const infoPanel = document.getElementById('info-proveedor');
    const rifSpan = document.getElementById('prov-info-rif');
    const contactoSpan = document.getElementById('prov-info-contacto');
    const selectProveedor = document.getElementById('comp-proveedor');

    if (!infoPanel) return;

    if (!valor) {
        infoPanel.style.display = 'none';
        if (rifSpan) rifSpan.textContent = '-';
        if (contactoSpan) contactoSpan.textContent = '-';
        return;
    }

    const selectedOption = selectProveedor.options[selectProveedor.selectedIndex];
    if (selectedOption && selectedOption.dataset.proveedor) {
        const prov = JSON.parse(selectedOption.dataset.proveedor);
        if (rifSpan) rifSpan.textContent = prov.rif || prov.documento || prov.id || 'N/A';
        if (contactoSpan) contactoSpan.textContent = prov.contacto || prov.telefono || prov.correo || 'N/A';
        infoPanel.style.display = 'block';
    } else {
        infoPanel.style.display = 'none';
    }
}
