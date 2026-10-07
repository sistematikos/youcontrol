// js/sys_v3_comp.js

document.addEventListener('DOMContentLoaded', () => {
    const buscador = document.getElementById('buscador-dinamico');
    const dropdown = document.getElementById('dropdown-resultados');

    if (!buscador || !dropdown) return;

    // 1. EVENTO DE BÚSQUEDA EN TIEMPO REAL
    buscador.addEventListener('input', (e) => {
        const query = e.target.value.trim().toLowerCase();

        if (query.length === 0) {
            dropdown.style.display = 'none';
            dropdown.innerHTML = '';
            return;
        }

        // Recuperar productos desde localStorage o memoria local
        const productos = JSON.parse(localStorage.getItem('sys_productos')) || [];

        // Filtrar coincidencia por SKU o Nombre
        const resultados = productos.filter(p => {
            const sku = (p.sku || p.id || '').toString().toLowerCase();
            const nombre = (p.nombre || p.descripcion || '').toString().toLowerCase();
            return sku.includes(query) || nombre.includes(query);
        });

        renderizarResultados(resultados);
    });

    // 2. RENDERIZAR RESULTADOS
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
            
            // Guardar el objeto en el elemento como atributo JSON para recuperarlo de forma segura
            item.dataset.producto = JSON.stringify(prod);

            dropdown.appendChild(item);
        });

        dropdown.style.display = 'block';
    }

    // 3. CAPTURAR EL CLIC EN LA OPCIÓN (Uso de 'mousedown' para evitar la pérdida de foco)
    dropdown.addEventListener('mousedown', (e) => {
        // Encontrar el contenedor '.dropdown-item' más cercano
        const item = e.target.closest('.dropdown-item');
        if (!item || !item.dataset.producto) return;

        e.preventDefault(); // Previene que el buscador pierda el foco antes de tiempo
        
        const prod = JSON.parse(item.dataset.producto);
        seleccionarProducto(prod);
    });

    // 4. ASIGNAR VALORES AL FORMULARIO Y CERRAR DROPDOWN
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

        // Ocultar la lista flotante y actualizar el buscador
        dropdown.style.display = 'none';
        buscador.value = `${prod.sku || prod.id || ''} - ${prod.nombre || prod.descripcion || ''}`;

        // Ocultar mensaje de alerta si estaba activo
        const aviso = document.getElementById('aviso-no-registrado');
        if (aviso) aviso.style.display = 'none';

        // Enfocar directamente el campo de cantidad para ingresar el stock
        if (cantidadInput) {
            cantidadInput.focus();
            cantidadInput.select();
        }
    }

    // 5. CERRAR EL DROPDOWN SI SE HACE CLIC FUERA
    document.addEventListener('click', (e) => {
        if (!buscador.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.style.display = 'none';
        }
    });
});
