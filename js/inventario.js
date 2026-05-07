import { db } from './firebase-config.js';
import { 
    collection, 
    getDocs, 
    doc, 
    getDoc, 
    onSnapshot, 
    deleteDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Datos de configuración de Sistematikos
const UID = "sUhfZI9Fy3M9UlInTYw2wFWZmB12";
let tasaActual = 1;

/**
 * Inicializa el monitor de tasa en tiempo real
 */
function inicializarMonitorTasa() {
    const tasaRef = doc(db, "usuarios", UID, "configuracion", "tasa");
    
    // onSnapshot permite que la tabla se actualice sola si cambias la tasa
    onSnapshot(tasaRef, (snapshot) => {
        if (snapshot.exists()) {
            tasaActual = snapshot.data().valor;
            const tasaDisplay = document.getElementById('tasa-actual');
            if (tasaDisplay) {
                tasaDisplay.innerText = tasaActual.toLocaleString('es-VE', { 
                    minimumFractionDigits: 2, 
                    maximumFractionDigits: 2 
                });
            }
            // Cada vez que la tasa cambie, refrescamos los cálculos de la tabla
            cargarProductos();
        } else {
            console.warn("No se encontró el documento de tasa.");
        }
    });
}

/**
 * Carga y renderiza la lista de productos en la tabla
 */
async function cargarProductos() {
    const tabla = document.getElementById('tabla-productos');
    if (!tabla) return;

    try {
        const productosRef = collection(db, "usuarios", UID, "productos");
        // Consulta simple para evitar el error "The query requires an index"
        const querySnapshot = await getDocs(productosRef);
        
        tabla.innerHTML = ""; // Limpiar tabla antes de cargar

        if (querySnapshot.empty) {
            tabla.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px;">No hay productos registrados.</td></tr>`;
            return;
        }

        querySnapshot.forEach((docSnap) => {
            const p = docSnap.data();
            const id = docSnap.id;
            
            // Cálculos financieros
            const precioRef = p.precio || 0;
            const totalBs = (precioRef * tasaActual).toLocaleString('es-VE', { 
                minimumFractionDigits: 2, 
                maximumFractionDigits: 2 
            });

            // Definir color del stock para visibilidad rápida
            const stockClass = p.stock <= 5 ? 'stock-low' : 'stock-ok';

            tabla.innerHTML += `
                <tr>
                    <td>
                        <div style="font-weight: 700; color: #1A1A2E;">${p.nombre}</div>
                        <small style="color: #64748b;">ID: ${id.substring(0,6)}...</small>
                    </td>
                    <td>
                        <span class="badge-stock ${stockClass}" style="padding: 5px 12px; border-radius: 20px; font-weight: bold;">
                            ${p.stock} unid.
                        </span>
                    </td>
                    <td style="font-weight: 600;">$${precioRef.toFixed(2)}</td>
                    <td style="color: #15803D; font-weight: 800; font-size: 1.1rem;">Bs. ${totalBs}</td>
                    <td>
                        <div style="display: flex; gap: 8px;">
                            <button class="btn-accion btn-edit" onclick="prepararEdicion('${id}')" title="Editar">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-accion btn-delete" onclick="confirmarEliminacion('${id}', '${p.nombre}')" title="Eliminar">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });
    } catch (error) {
        console.error("Error al cargar productos:", error);
        tabla.innerHTML = `<tr><td colspan="5" style="color:red; text-align:center;">Error de conexión: ${error.message}</td></tr>`;
    }
}

/**
 * Funciones Globales para botones de la tabla
 */
window.confirmarEliminacion = async (id, nombre) => {
    if (confirm(`¿Estás seguro de eliminar "${nombre}"? Esta acción no se puede deshacer.`)) {
        try {
            await deleteDoc(doc(db, "usuarios", UID, "productos", id));
            alert("Producto eliminado correctamente.");
            cargarProductos(); // Refrescar lista
        } catch (e) {
            alert("Error al eliminar: " + e.message);
        }
    }
};

window.prepararEdicion = (id) => {
    // Aquí podrías disparar tu modal de edición
    console.log("Editando producto:", id);
    alert("Función de edición para ID: " + id);
};

// Iniciar la ejecución
inicializarMonitorTasa();
