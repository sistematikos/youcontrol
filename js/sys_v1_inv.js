import { db } from './firebase-config.js';
import { 
    collection, onSnapshot, addDoc, deleteDoc, doc, getDocs 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const USER_ID = "sUhfZI9Fy3M9UlInTYw2wFWZmB12";
let productos = [];

// --- MOSTRAR NOTIFICACIÓN / CARGA ARRIBA ---
function mostrarEstado(mensaje, tipo) {
    const bar = document.getElementById('status-bar');
    if (!bar) return;
    
    bar.className = `status-${tipo}`;
    bar.innerText = mensaje;
    bar.style.display = 'block';

    if (tipo === 'success') {
        setTimeout(() => { bar.style.display = 'none'; }, 3000);
    }
}

// --- CARGAR INVENTARIO ---
function renderizarTabla(lista) {
    const tbody = document.getElementById('tabla-inventario');
    if (!tbody) return;

    if (lista.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#94a3b8;">No hay productos registrados.</td></tr>`;
        return;
    }

    tbody.innerHTML = lista.map(p => `
        <tr>
            <td><b>${p.nombre}</b></td>
            <td>$${parseFloat(p.precio).toFixed(2)}</td>
            <td>${p.stock || 0} u.</td>
            <td style="text-align: center;">
                <button class="btn-delete" onclick="window.eliminarArticulo('${p.id}')" title="Eliminar">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// Escucha en tiempo real de Firebase
onSnapshot(collection(db, "usuarios", USER_ID, "productos"), (snapshot) => {
    productos = [];
    snapshot.forEach(doc => productos.push({ id: doc.id, ...doc.data() }));
    renderizarTabla(productos);
});

// --- GUARDAR NUEVO ARTÍCULO ---
window.agregarArticulo = async () => {
    const nombreInput = document.getElementById('p-nombre');
    const precioInput = document.getElementById('p-precio');
    const stockInput = document.getElementById('p-stock');

    const nombre = nombreInput.value.trim();
    const precio = parseFloat(precioInput.value);
    const stock = parseInt(stockInput.value);

    if (!nombre || isNaN(precio) || isNaN(stock)) {
        alert("Por favor rellene todos los campos correctamente.");
        return;
    }

    // Activar barra de carga arriba
    mostrarEstado("⏳ Registrando artículo en la base de datos...", "loading");

    try {
        await addDoc(collection(db, "usuarios", USER_ID, "productos"), {
            nombre: nombre,
            precio: precio,
            stock: stock
        });

        // Limpiar inputs
        nombreInput.value = '';
        precioInput.value = '';
        stockInput.value = '';

        mostrarEstado("✅ ¡Producto añadido con éxito!", "success");
    } catch (e) {
        mostrarEstado("❌ Error al guardar en Firebase", "loading");
        console.error(e);
    }
};

// --- ELIMINAR ARTÍCULO ---
window.eliminarArticulo = async (id) => {
    if (!confirm("¿Está seguro de que desea eliminar este producto del inventario?")) return;
    try {
        await deleteDoc(doc(db, "usuarios", USER_ID, "productos", id));
        mostrarEstado("🗑️ Producto removido", "success");
    } catch (e) {
        alert("Error al eliminar: " + e.message);
    }
};

// --- FUNCIÓN DEL BOTÓN ACTUALIZAR COMPACTO ---
window.forzarRefresco = async () => {
    mostrarEstado("🔄 Sincronizando con Firebase...", "loading");
    try {
        const querySnapshot = await getDocs(collection(db, "usuarios", USER_ID, "productos"));
        productos = [];
        querySnapshot.forEach(doc => productos.push({ id: doc.id, ...doc.data() }));
        renderizarTabla(productos);
        mostrarEstado("✅ Base de datos sincronizada", "success");
    } catch (e) {
        mostrarEstado("❌ Error de sincronización", "loading");
    }
};

// --- CONTROL DEL FILTRADO/BUSCADOR ---
document.getElementById('searchBar')?.addEventListener('input', (e) => {
    const txt = e.target.value.toLowerCase();
    const filtrados = productos.filter(p => p.nombre.toLowerCase().includes(txt));
    renderizarTabla(filtrados);
});
