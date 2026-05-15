import { db } from './firebase-config.js';
import { collection, doc, setDoc, getDocs, deleteDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const UID = "sUhfZI9Fy3M9UlInTYw2wFWZmB12";
const tabla = document.getElementById('cuerpo-tabla');
const inputTasa = document.getElementById('tasaCambio');

// --- ACTUALIZAR COLUMNA BS AL CAMBIAR TASA ---
window.actualizarPreciosBS = () => {
    const tasa = parseFloat(inputTasa.value) || 1;
    document.querySelectorAll('.fila-producto').forEach(fila => {
        const pDolar = parseFloat(fila.querySelector('.p-precio').value) || 0;
        fila.querySelector('.p-precio-bs').value = (pDolar * tasa).toFixed(2);
    });
};

// --- CÁLCULOS DE MARGEN Y PRECIO DE VENTA ---
window.calcularPrecios = (input, tipo) => {
    const fila = input.closest('.fila-producto');
    const costo = parseFloat(fila.querySelector('.p-costo').value) || 0;
    const porc = parseFloat(fila.querySelector('.p-porcentaje').value) || 0;
    const venta = parseFloat(fila.querySelector('.p-precio').value) || 0;

    if (tipo === 'costo' || tipo === 'porcentaje') {
        const nuevoPrecio = costo + (costo * (porc / 100));
        fila.querySelector('.p-precio').value = nuevoPrecio.toFixed(2);
    } else if (tipo === 'precio' && costo > 0) {
        const nuevoPorc = ((venta - costo) / costo) * 100;
        fila.querySelector('.p-porcentaje').value = nuevoPorc.toFixed(2);
    }
    window.actualizarPreciosBS();
};

// --- CREAR FILA EN TABLA ---
window.agregarFila = (bar = "", sku = "", nom = "", cos = 0, por = 0, pre = 0, sto = 0, existe = false) => {
    if (tabla.querySelector('td[colspan]')) tabla.innerHTML = "";
    const tasa = parseFloat(inputTasa.value) || 1;

    const tr = document.createElement('tr');
    tr.className = "fila-producto";
    tr.innerHTML = `
        <td><input type="text" class="input-table p-barcode" value="${bar}" placeholder="Scanner"></td>
        <td><input type="text" class="input-table p-sku" value="${sku}" placeholder="SKU" ${existe ? 'readonly style="background:#f1f5f9;"' : ''}></td>
        <td><input type="text" class="input-table p-nombre" value="${nom}" placeholder="Producto"></td>
        <td><input type="number" class="input-table p-costo" value="${cos}" step="0.01" oninput="window.calcularPrecios(this, 'costo')"></td>
        <td><input type="number" class="input-table p-porcentaje" value="${por}" step="0.1" oninput="window.calcularPrecios(this, 'porcentaje')"></td>
        <td><input type="number" class="input-table p-precio" value="${pre}" step="0.01" oninput="window.calcularPrecios(this, 'precio')"></td>
        <td><input type="text" class="input-table p-precio-bs" value="${(pre * tasa).toFixed(2)}" readonly></td>
        <td><input type="number" class="input-table p-stock" value="${sto}"></td>
        <td style="text-align:center;"><button class="btn-remove" onclick="window.eliminarProducto(this, '${sku}')"><i class="fas fa-trash"></i></button></td>
    `;
    tabla.appendChild(tr);
};

// --- CARGAR TASA Y PRODUCTOS AL INICIAR ---
async function cargarTodo() {
    try {
        // Cargar Tasa guardada en Firebase
        const tasaSnap = await getDoc(doc(db, "usuarios", UID, "configuracion", "tasa"));
        if (tasaSnap.exists()) inputTasa.value = tasaSnap.data().valor || 1;

        // Cargar Productos
        const querySnapshot = await getDocs(collection(db, "usuarios", UID, "productos"));
        tabla.innerHTML = "";
        if (querySnapshot.empty) { window.agregarFila(); return; }

        querySnapshot.forEach((docSnap) => {
            const p = docSnap.data();
            const porc = p.costo > 0 ? ((p.precio - p.costo) / p.costo) * 100 : 0;
            window.agregarFila(p.codigo_barras || "", docSnap.id, p.nombre, p.costo || 0, porc.toFixed(2), p.precio || 0, p.stock || 0, true);
        });
    } catch (e) { 
        console.error(e);
        tabla.innerHTML = "<tr><td colspan='9' style='text-align:center; color:red;'>Error de conexión</td></tr>";
    }
}

// --- GUARDAR INVENTARIO Y CONFIGURACIÓN ---
window.guardarInventario = async () => {
    const btn = document.getElementById('btnGuardarTodo');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> GUARDANDO...';

    try {
        // Guardar Tasa actual en Firebase
        await setDoc(doc(db, "usuarios", UID, "configuracion", "tasa"), { valor: parseFloat(inputTasa.value) });

        const filas = document.querySelectorAll('.fila-producto');
        for (let fila of filas) {
            const sku = fila.querySelector('.p-sku').value.trim();
            const nombre = fila.querySelector('.p-nombre').value.trim();
            if (sku && nombre) {
                await setDoc(doc(db, "usuarios", UID, "productos", sku), {
                    codigo_barras: fila.querySelector('.p-barcode').value.trim(),
                    nombre: nombre,
                    costo: parseFloat(fila.querySelector('.p-costo').value) || 0,
                    precio: parseFloat(fila.querySelector('.p-precio').value) || 0,
                    stock: parseInt(fila.querySelector('.p-stock').value) || 0,
                    ultima_edicion: new Date().toISOString()
                }, { merge: true });
            }
        }
        alert("Sincronización completa");
        location.reload();
    } catch (e) { alert("Error al guardar"); }
    finally { btn.disabled = false; btn.innerHTML = '<i class="fas fa-sync-alt"></i> SINCRONIZAR CON FIREBASE'; }
};

window.eliminarProducto = async (btn, id) => {
    if (id && confirm(`¿Eliminar ${id} permanentemente?`)) {
        await deleteDoc(doc(db, "usuarios", UID, "productos", id));
        btn.closest('tr').remove();
    } else if (!id) btn.closest('tr').remove();
};

cargarTodo();
