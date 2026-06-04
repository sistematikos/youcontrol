import { db } from './firebase-config.js';
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const USER_ID = localStorage.getItem('youcontrol_empresa_id');

// BUSCADOR: Al presionar Enter busca el producto
document.getElementById('buscador-prod').addEventListener('keypress', async (e) => {
    if (e.key === 'Enter') {
        const sku = e.target.value.trim();
        if (!sku) return;

        const prodRef = doc(db, "usuarios", USER_ID, "productos", sku);
        const snap = await getDoc(prodRef);

        if (snap.exists()) {
            const data = snap.data();
            document.getElementById('prod-sku').value = data.sku || "";
            document.getElementById('prod-nombre').value = data.nombre || "";
            document.getElementById('prod-precio').value = data.precio || 0;
            document.getElementById('prod-stock').value = data.stock || 0;
            document.getElementById('prod-depto').value = data.departamento || "";
        } else {
            alert("SKU no encontrado. Puedes llenar los campos para crear uno nuevo.");
        }
    }
});

// GUARDAR O MODIFICAR
window.guardarProducto = async function() {
    const sku = document.getElementById('prod-sku').value.trim();
    if (!sku) return alert("El SKU es obligatorio para guardar.");

    const data = {
        sku: sku,
        nombre: document.getElementById('prod-nombre').value,
        precio: parseFloat(document.getElementById('prod-precio').value || 0),
        stock: parseInt(document.getElementById('prod-stock').value || 0),
        departamento: document.getElementById('prod-depto').value.toUpperCase()
    };

    try {
        await setDoc(doc(db, "usuarios", USER_ID, "productos", sku), data);
        alert("¡Producto guardado exitosamente!");
        // Limpiar formulario tras guardar
        document.getElementById('buscador-prod').value = "";
    } catch (e) {
        alert("Error al guardar: " + e.message);
    }
};
