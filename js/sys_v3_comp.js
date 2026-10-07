// js/sys_v3_comp.js
import { db } from './firebase-config.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let productosCache = []; // Almacén local temporal para filtrar rápido sin recargar Firestore a cada rato

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Cargar proveedores y productos desde Firestore al iniciar
    await cargarProveedoresFirestore();
    await cargarProductosFirestore();

    const buscador = document.getElementById('buscador-dinamico');
    const dropdown = document.getElementById('dropdown-resultados');
    const selectProveedor = document.getElementById('comp-proveedor');

    if (selectProveedor) {
        selectProveedor.addEventListener('change', (e) => {
            manejarSeleccionProveedor(e.target.value);
        });
    }

    // 2. ACTIVAR CÁLCULOS AUTOMÁTICOS DE PRECIOS Y GANANCIAS
    inicializarCalculosPrecios();

    if (!buscador || !dropdown) return;

    // 3. BÚSQUEDA DE PRODUCTOS EN TIEMPO REAL (Filtra sobre la caché de Firestore)
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

    // 4. SELECCIÓN DE PRODUCTO
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

        // Disparar recálculo de precios tras asignar valores
        calcularPrecioVenta();

        dropdown.style.display = 'none';
        buscador.value = `${prod.sku || prod.codigo || prod.id || ''} - ${prod.nombre || prod.descripcion || ''}`;

        const aviso = document.getElementById('aviso-no-registrado');
        if (aviso) aviso.style.display = 'none';

        if (cantidadInput) {
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

// 5. FUNCIONES DE CÁLCULO DE PORCENTAJES Y PRECIOS
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

    // Fórmula: Precio = Costo + (Costo * (Ganancia / 100))
    const precioVenta = costo + (costo * (ganancia / 100));

    if (precioInput) {
        precioInput.value = precioVenta.toFixed(2);
    }

    // Cálculo opcional en Bolívares (Si manejas tasa BCV almacenada, puedes ajustarlo aquí)
    const tasaCambio = parseFloat(localStorage.getItem('sys_tasa_bcv')) || 1;
    if (precioBsInput) {
        const totalBs = precioVenta * tasaCambio;
        precioBsInput.value = totalBs.toFixed(2) + ' Bs.';
    }
}

function calcularPorcentajeGanancia() {
    const costo = parseFloat(document.getElementById('comp-costo')?.value) || 0;
    const precioVenta = parseFloat(document.getElementById('comp-precio')?.value) || 0;
    const gananciaInput = document.getElementById('comp-ganancia');

    if (costo <= 0) return;

    // Fórmula inversa: % Ganancia = ((Precio - Costo) / Costo) * 100
    const ganancia = ((precioVenta - costo) / costo) * 100;

    if (gananciaInput) {
        gananciaInput.value = ganancia.toFixed(2);
    }
}

// 6. CARGAR PROVEEDORES DESDE FIRESTORE
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

// 7. CARGAR PRODUCTOS DESDE FIRESTORE
async function cargarProductosFirestore() {
    try {
        const empresaId = localStorage.getItem('youcontrol_empresa_id');
        if (!empresaId) return;

        const querySnapshot = await getDocs(collection(db, "usuarios", empresaId, "productos"));
        
        productosCache = [];
        querySnapshot.forEach((docSnap) => {
            productosCache.push({ id: docSnap.id, ...docSnap.data() });
        });

        console.log(`Productos cargados desde Firestore: ${productosCache.length}`);
    } catch (error) {
        console.error("Error al cargar productos de Firestore:", error);
        productosCache = JSON.parse(localStorage.getItem('sys_productos')) || [];
    }
}

function manejarSeleccionProveedor(valor) {
    const selectProveedor = document.getElementById('comp-proveedor');
    const infoPanel = document.getElementById('info-proveedor');
    const rifSpan = document.getElementById('prov-info-rif');
    const contactoSpan = document.getElementById('prov-info-contacto');

    if (!selectProveedor || !infoPanel) return;

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
