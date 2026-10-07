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

    if (!buscador || !dropdown) return;

    // 2. BÚSQUEDA DE PRODUCTOS EN TIEMPO REAL (Filtra sobre la caché de Firestore)
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

    // 3. SELECCIÓN DE PRODUCTO
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

// 4. CARGAR PROVEEDORES DESDE FIRESTORE
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

// 5. CARGAR PRODUCTOS DESDE FIRESTORE
async function cargarProductosFirestore() {
    try {
        const empresaId = localStorage.getItem('youcontrol_empresa_id');
        if (!empresaId) return;

        // Ajusta "productos" si tu colección en Firestore se llama diferente (ej. "inventario")
        const querySnapshot = await getDocs(collection(db, "usuarios", empresaId, "productos"));
        
        productosCache = [];
        querySnapshot.forEach((docSnap) => {
            productosCache.push({ id: docSnap.id, ...docSnap.data() });
        });

        console.log(`Productos cargados desde Firestore: ${productosCache.length}`);
    } catch (error) {
        console.error("Error al cargar productos de Firestore:", error);
        // Fallback a localStorage por si acaso la colección usa otro nombre
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
