import { db } from './firebase-config.js';
import { collection, doc, setDoc, getDocs, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Configuración de Identidad
const UID = "sUhfZI9Fy3M9UlInTYw2wFWZmB12";
const tabla = document.getElementById('cuerpo-tabla');

/**
 * 1. CARGA INICIAL: Trae los productos de Firebase al abrir el módulo
 */
async function cargarInventario() {
    try {
        const querySnapshot = await getDocs(collection(db, "usuarios", UID, "productos"));
        tabla.innerHTML = ""; // Limpiar el spinner de carga
        
        if (querySnapshot.empty) {
            window.agregarFila(); // Si no hay nada, dejar una fila lista
            return;
        }

        querySnapshot.forEach((docSnap) => {
            const p = docSnap.data();
            crearFilaHTML(docSnap.id, p.nombre, p.precio, p.stock, true);
        });
    } catch (error) {
        console.error("Error Core:", error);
        tabla.innerHTML = "<tr><td colspan='5' style='color:red; text-align:center;'>Error de conexión con Firebase</td></tr>";
    }
}

/**
 * 2. RENDERIZADO: Crea las filas en la tabla
 */
function crearFilaHTML(id = "", nombre = "", precio = "", stock = "", esExistente = false) {
    const tr = document.createElement('tr');
    tr.className = "fila-producto";
    tr.innerHTML = `
        <td>
            <input type="text" class="input-table p-barcode" 
                   value="${id}" placeholder="Código o SKU" 
                   ${esExistente ? 'readonly style="background:#e2e8f0; color:#64748b"' : ''}>
        </td>
        <td><input type="text" class="input-table p-nombre" value="${nombre}" placeholder="Nombre del producto"></td>
        <td><input type="number" class="input-table p-precio" value="${precio}" step="0.01"></td>
        <td><input type="number" class="input-table p-stock" value="${stock}"></td>
        <td style="text-align: center;">
            <button class="btn-remove" onclick="eliminarProducto(this, '${id}')">
                <i class="fas fa-trash"></i>
            </button>
        </td>
    `;
    tabla.appendChild(tr);
    // Solo dar foco si es una fila nueva
    if(!esExistente) tr.querySelector('.p-barcode').focus();
}

// Global para el botón "+ Nueva Fila"
window.agregarFila = () => crearFilaHTML();

/**
 * 3. ELIMINACIÓN: Borra del DOM y de Firebase
 */
window.eliminarProducto = async (btn, id) => {
    if (id && confirm(`¿Seguro que desea eliminar el producto ${id}?`)) {
        try {
            await deleteDoc(doc(db, "usuarios", UID, "productos", id));
            btn.parentElement.parentElement.remove();
        } catch (e) { alert("No se pudo eliminar de la base de datos"); }
    } else if (!id) {
        // Si la fila es nueva y no tiene ID, solo la quitamos de la vista
        btn.parentElement.parentElement.remove();
    }
};

/**
 * 4. GUARDADO MASIVO: Sincroniza todos los cambios
 */
window.guardarInventario = async () => {
    const filas = document.querySelectorAll('.fila-producto');
    const btn = document.getElementById('btnGuardarTodo');
    
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> SINCRONIZANDO...';

    try {
        for (let fila of filas) {
            const id = fila.querySelector('.p-barcode').value.trim();
            const nombre = fila.querySelector('.p-nombre').value.trim();
            const precio = parseFloat(fila.querySelector('.p-precio').value) || 0;
            const stock = parseInt(fila.querySelector('.p-stock').value) || 0;

            // Validamos que tenga código y nombre
            if (id && nombre) {
                const productoRef = doc(db, "usuarios", UID, "productos", id);
                await setDoc(productoRef, {
                    nombre: nombre,
                    precio: precio,
                    stock: stock,
                    costo: precio * 0.75, // Ajuste de margen para reportes
                    ultima_edicion: new Date().toISOString(),
                    modulo: "sys_v1_inv"
                }, { merge: true });
            }
        }
        alert("¡Base de datos actualizada con éxito!");
        location.reload(); // Recargamos para que los nuevos IDs se vuelvan 'readonly'
    } catch (error) {
        console.error("Error al guardar:", error);
        alert("Ocurrió un error al procesar la carga");
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-sync-alt"></i> SINCRONIZAR CON FIREBASE';
    }
};

// Arrancar el sistema
cargarInventario();
