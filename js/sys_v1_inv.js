// Importar la configuración de Firebase compartida de tu proyecto
import { db } from './sys_firebase_config.js'; 
import { ref, onValue, set, push, remove, update } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

// Referencia a la tabla de productos en Firebase
const productosRef = ref(db, 'productos');

// Estado Global de la pantalla
let listaProductos = [];
let tasaActual = 1.00;

// Elementos del DOM
const cuerpoTabla = document.getElementById('cuerpo-tabla');
const tasaInput = document.getElementById('tasaCambio');
const buscadorInput = document.getElementById('buscador');
const statusBar = document.getElementById('status-bar-inv');

// Inputs del Modal
const modal = document.getElementById('modalProducto');
const modalTitulo = document.getElementById('modalTitulo');
const formId = document.getElementById('form-id');
const formBarras = document.getElementById('form-barras');
const formSku = document.getElementById('form-sku');
const formNombre = document.getElementById('form-nombre');
const formCosto = document.getElementById('form-costo');
const formGanancia = document.getElementById('form-ganancia');
const formPrecio = document.getElementById('form-precio');
const formStock = document.getElementById('form-stock');

---

## 📦 1. Inicialización y Escucha de Datos (Realtime)

// Escuchar cambios en la base de datos de Firebase
onValue(productosRef, (snapshot) => {
    mostrarStatusBar("Cargando y sincronizando inventario...", "loading");
    cuerpoTabla.innerHTML = '';
    listaProductos = [];

    if (snapshot.exists()) {
        const datos = snapshot.val();
        
        // Mapeamos los datos con su respectivo ID de Firebase
        for (let id in datos) {
            listaProductos.push({ id, ...datos[id] });
        }
        
        renderizarTabla(listaProductos);
        mostrarStatusBar("Base de datos sincronizada con Firebase", "success");
    } else {
        cuerpoTabla.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:30px;">No hay productos registrados en el inventario.</td></tr>`;
        ocultarStatusBar();
    }
}, (error) => {
    console.error("Error de Firebase:", error);
    mostrarStatusBar("Error al conectar con la base de datos", "error");
});

---

## 🎨 2. Renderizado de la Tabla de Productos

function renderizarTabla(productos) {
    if (productos.length === 0) {
        cuerpoTabla.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:30px;">No se encontraron productos coincidentes.</td></tr>`;
        return;
    }

    cuerpoTabla.innerHTML = '';
    
    productos.forEach(prod => {
        const costo = parseFloat(prod.costo || 0);
        const ganancia = parseFloat(prod.ganancia || 0);
        const precioUSD = parseFloat(prod.precio || 0);
        const stock = parseInt(prod.stock || 0);
        
        // Cálculo del precio en Bolívares en tiempo real en base a la tasa superior
        const precioBS = (precioUSD * tasaActual).toFixed(2);

        const fila = document.createElement('tr');
        fila.innerHTML = `
            <td class="txt-bold">${prod.barras || '—'}</td>
            <td>${prod.sku || '—'}</td>
            <td>${prod.nombre || 'Sin Descripción'}</td>
            <td>$ ${costo.toFixed(2)}</td>
            <td>${ganancia}%</td>
            <td class="txt-bold">$ ${precioUSD.toFixed(2)}</td>
            <td><span class="badge-bs">Bs. ${precioBS}</span></td>
            <td><span class="badge-stock" style="${stock <= 5 ? 'background: #FEE2E2; color: #EF4444;' : ''}">${stock}</span></td>
            <td style="text-align: center;">
                <button class="btn-edit" onclick="window.abrirModalEditar('${prod.id}')" title="Editar">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-remove" onclick="window.eliminarProducto('${prod.id}', '${prod.nombre}')" title="Eliminar">
                    <i class="fas fa-trash-can"></i>
                </button>
            </td>
        `;
        cuerpoTabla.appendChild(fila);
    });
}

---

## 🔍 3. Buscador Dinámico y Control de Tasas

// Filtrar productos en tiempo real por Nombre, SKU o Código de Barras
window.filtrarProductos = function() {
    const busqueda = buscadorInput.value.toLowerCase().trim();
    
    const productosFiltrados = listaProductos.filter(prod => {
        const nombre = (prod.nombre || '').toLowerCase();
        const sku = (prod.sku || '').toLowerCase();
        const barras = (prod.barras || '').toLowerCase();
        
        return nombre.includes(busqueda) || sku.includes(busqueda) || barras.includes(busqueda);
    });
    
    renderizarTabla(productosFiltrados);
};

// Actualizar los precios en BS de la tabla cuando cambia la tasa superior
window.actualizarTasaTop = function() {
    const valorTasa = parseFloat(tasaInput.value);
    if (!isNaN(valorTasa) && valorTasa > 0) {
        tasaActual = valorTasa;
        // Re-renderiza con la lista actual o filtrada sin ir a la base de datos
        window.filtrarProductos(); 
    }
};

---

## 🪟 4. Lógica de Ventanas Modales (Modo Crear / Editar)

window.abrirModalNuevo = function() {
    modalTitulo.innerHTML = `<i class="fas fa-plus"></i> Nuevo Producto`;
    formId.value = '';
    formBarras.value = '';
    formSku.value = '';
    formNombre.value = '';
    formCosto.value = '';
    formGanancia.value = '';
    formPrecio.value = '';
    formStock.value = '0';
    
    modal.style.display = 'flex';
    formBarras.focus();
};

window.abrirModalEditar = function(id) {
    const prod = listaProductos.find(p => p.id === id);
    if (!prod) return;

    modalTitulo.innerHTML = `<i class="fas fa-box"></i> Editar Producto`;
    formId.value = prod.id;
    formBarras.value = prod.barras || '';
    formSku.value = prod.sku || '';
    formNombre.value = prod.nombre || '';
    formCosto.value = prod.costo || '';
    formGanancia.value = prod.ganancia || '';
    formPrecio.value = prod.precio || '';
    formStock.value = prod.stock || '0';

    modal.style.display = 'flex';
    formNombre.focus();
};

window.cerrarModal = function() {
    modal.style.display = 'none';
};

---

## 🧮 5. Modelos Matemáticos del Formulario (Costos e Intereses)

// Al escribir Costo o % Ganancia -> Calcula el Precio USD automáticamente
window.calcularPrecioModal = function() {
    const costo = parseFloat(formCosto.value) || 0;
    const ganancia = parseFloat(formGanancia.value) || 0;
    
    const precioCalculado = costo + (costo * (ganancia / 100));
    formPrecio.value = precioCalculado.toFixed(2);
};

// Al escribir directamente el Precio USD -> Recalcula el % de Ganancia obtenido
window.calcularGananciaModal = function() {
    const costo = parseFloat(formCosto.value) || 0;
    const precio = parseFloat(formPrecio.value) || 0;
    
    if (costo > 0) {
        const gananciaCalculada = ((precio - costo) / costo) * 100;
        formGanancia.value = gananciaCalculada.toFixed(1);
    } else {
        formGanancia.value = '0';
    }
};

---

## 💾 6. Operaciones de Escritura y Borrado (C.R.U.D)

window.guardarCambiosModal = function() {
    const id = formId.value;
    const nombre = formNombre.value.trim();
    
    if (!nombre) {
        alert("La descripción del producto es obligatoria.");
        return;
    }

    const productoData = {
        barras: formBarras.value.trim(),
        sku: formSku.value.trim(),
        nombre: nombre,
        costo: parseFloat(formCosto.value) || 0,
        ganancia: parseFloat(formGanancia.value) || 0,
        precio: parseFloat(formPrecio.value) || 0,
        stock: parseInt(formStock.value) || 0
    };

    if (id) {
        // Modo Edición: Actualizar registro existente
        update(ref(db, `productos/${id}`), productoData)
            .then(() => {
                window.cerrarModal();
                mostrarStatusBar("Producto actualizado correctamente", "success");
            })
            .catch(err => alert("Error al actualizar: " + err));
    } else {
        // Modo Nuevo: Generar ID único incremental o hash empujado por Firebase
        const nuevoProductoRef = push(productosRef);
        set(nuevoProductoRef, productoData)
            .then(() => {
                window.cerrarModal();
                mostrarStatusBar("Nuevo producto registrado", "success");
            })
            .catch(err => alert("Error al registrar: " + err));
    }
};

window.eliminarProducto = function(id, nombre) {
    if (confirm(`¿Estás completamente seguro de eliminar el ítem: "${nombre}"?`)) {
        remove(ref(db, `productos/${id}`))
            .then(() => {
                mostrarStatusBar("Producto eliminado con éxito", "success");
            })
            .catch(err => alert("Error al eliminar: " + err));
    }
};

---

## 📢 7. Utilidades de Interfaz de Usuario (Status Bar)

function mostrarStatusBar(mensaje, tipo) {
    statusBar.innerText = mensaje;
    statusBar.className = ''; // Limpiar clases
    statusBar.style.display = 'block';

    if (tipo === 'loading') {
        statusBar.classList.add('status-loading');
    } else if (tipo === 'success') {
        statusBar.classList.add('status-success');
        setTimeout(ocultarStatusBar, 3500); // Auto-ocultar si todo sale bien
    }
}

function ocultarStatusBar() {
    statusBar.style.display = 'none';
}
