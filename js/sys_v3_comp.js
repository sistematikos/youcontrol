// js/sys_v3_comp.js
import { db, auth } from './firebase-config.js'; // Ajusta la ruta a tu archivo de configuración de Firebase si es necesario
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    // 1. CARGAR PROVEEDORES DESDE FIRESTORE AL INICIAR
    cargarProveedoresDesdeFirestore();

    const buscador = document.getElementById('buscador-dinamico');
    const dropdown = document.getElementById('dropdown-resultados');

    if (!buscador || !dropdown) return;

    // 2. EVENTO DE BÚSQUEDA DE PRODUCTOS EN TIEMPO REAL
    buscador.addEventListener('input', (e) => {
        const query = e.target.value.trim().toLowerCase();

        if (query.length === 0) {
            dropdown.style.display = 'none';
            dropdown.innerHTML = '';
            return;
        }

        const productos = JSON.parse(localStorage.getItem('sys_productos')) || [];

        const resultados = productos.filter(p => {
            const sku = (p.sku || p.id || '').toString().toLowerCase();
            const nombre = (p.nombre || p.descripcion || '').toString().toLowerCase();
            return sku.includes(query) || nombre.includes(query);
        });

        renderizarResultados(resultados);
    });

    function renderizarResultados(lista) {
        dropdown.innerHTML = '';

        if (lista.length === 0) {
            dropdown.innerHTML = '<div style="padding: 10px; font-size: 0.8rem; color: #94A3B8;">Producto no registrado</div>';
            dropdown.style.display = 'block';
            return;
        }

        lista.forEach(prod => {
            const item = document.createElement('div');
            item.className = 'dropdown-item';
            
            const skuTxt = prod.sku || prod.id || 'S/N';
            const nombreTxt = prod.nombre || prod.descripcion || 'Sin Nombre';

            item.innerHTML = `<strong>${skuTxt}</strong> - ${nombreTxt}`;
            item.dataset.producto = JSON.stringify(prod);

            dropdown.appendChild(item);
        });

        dropdown.style.display = 'block';
    }

    // 3. CAPTURAR CLIC EN RESULTADO DE PRODUCTO
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

        if (skuInput) skuInput.value = prod.sku || prod.id || '';
        if (nombreInput) nombreInput.value = prod.nombre || prod.descripcion || '';
        if (costoInput) costoInput.value = prod.costo || '0.00';
        if (gananciaInput) gananciaInput.value = prod.ganancia || '0';
        if (precioInput) precioInput.value = prod.precio || '0.00';

        dropdown.style.display = 'none';
        buscador.value = `${prod.sku || prod.id || ''} - ${prod.nombre || prod.descripcion || ''}`;

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

// 4. CARGAR PROVEEDORES DESDE LA SUBCOLECCIÓN DE FIRESTORE
async function cargarProveedoresDesdeFirestore() {
    const selectProveedor = document.getElementById('comp-proveedor');
    if (!selectProveedor) return;

    try {
        // Obtener el ID del usuario activo guardado en sessionStorage o localStorage (ej. 'YC-20260919-F2')
        const usuarioActivoId = localStorage.getItem('usuario_activo_id') || sessionStorage.getItem('usuario_activo_id');
        
        // Si tienes una forma global de obtener el ID del usuario actual, asegúrate de colocarlo aquí.
        // O bien, si ya manejas una ruta fija para la empresa actual:
        if (!usuarioActivoId) {
            console.warn("No se encontró el ID de usuario activo para buscar los proveedores.");
            return;
        }

        const querySnapshot = await getDocs(collection(db, "usuarios", usuarioActivoId, "proveedores"));
        
        selectProveedor.innerHTML = '<option value="">-- Casual / General --</option>';

        querySnapshot.forEach((docSnap) => {
            const prov = docSnap.data();
            const provId = docSnap.id; // Ejemplo: "BENF"

            const opt = document.createElement('option');
            opt.value = provId;
            opt.textContent = prov.nombre || prov.empresa || provId;
            
            // Guardamos los datos completos en el dataset para mostrarlos al seleccionar
            opt.dataset.proveedor = JSON.stringify({ id: provId, ...prov });
            selectProveedor.appendChild(opt);
        });

    } catch (error) {
        console.error("Error al cargar los proveedores desde Firestore:", error);
    }
}

window.seleccionarProveedor = function(valor) {
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
        if (contactoSpan) contactoSpan.textContent = prov.contacto || prov.telefono || 'N/A';
        
        infoPanel.style.display = 'block';
    } else {
        infoPanel.style.display = 'none';
    }
}
