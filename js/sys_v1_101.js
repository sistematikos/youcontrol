import { db } from './firebase-config.js';
import { collection, onSnapshot, doc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Tu UID de desarrollador
const UID = "sUhfZI9Fy3M9UlInTYw2wFWZmB12";
let tasaActual = 0;

/**
 * 1. OBTENER TASA DE CONFIGURACIÓN
 */
function inicializarSistema() {
    const tasaRef = doc(db, "usuarios", UID, "configuracion", "tasa");
    
    onSnapshot(tasaRef, (snap) => {
        if (snap.exists()) {
            tasaActual = snap.data().valor;
            document.getElementById('tasa-valor').innerText = tasaActual.toLocaleString('es-VE', { minimumFractionDigits: 2 }) + " Bs.";
            // Solo cargamos productos cuando ya conocemos la tasa
            cargarProductos();
        } else {
            console.error("No se encontró el documento de tasa en Firebase");
        }
    }, (error) => {
        console.error("Error al leer tasa:", error);
    });
}

/**
 * 2. CARGAR LISTADO DE PRODUCTOS
 */
function cargarProductos() {
    const productosRef = collection(db, "usuarios", UID, "productos");
    const tabla = document.getElementById('tabla-inventario');

    onSnapshot(productosRef, (snapshot) => {
        tabla.innerHTML = "";

        if (snapshot.empty) {
            tabla.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:30px; color:#94A3B8;">No hay productos en el inventario</td></tr>';
            return;
        }

        snapshot.forEach((docSnap) => {
            const p = docSnap.data();
            const id = docSnap.id;
            
            // Cálculo de precio en Bolívares
            const precioBsNum = p.precio * tasaActual;
            const precioBsFormat = precioBsNum.toLocaleString('es-VE', { minimumFractionDigits: 2 });

            tabla.innerHTML += `
                <tr>
                    <td>
                        <span class="prod-name">${p.nombre}</span>
                        <span class="prod-code"><i class="fas fa-barcode"></i> ${p.codigo || 'SIN CÓDIGO'}</span>
                    </td>
                    <td><span class="badge-stock">${p.stock}</span></td>
                    <td><span style="font-weight:600;">$${p.precio.toFixed(2)}</span></td>
                    <td><span class="price-bs">${precioBsFormat} Bs.</span></td>
                    <td style="text-align: center;">
                        <button class="btn-edit" onclick="editarProducto('${id}')" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-disable" onclick="desactivarProducto('${id}')" title="Desactivar">
                            <i class="fas fa-eye-slash"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
    }, (error) => {
        console.error("Error al leer productos:", error);
        tabla.innerHTML = '<tr><td colspan="5" style="text-align:center; color:red;">Error de permisos en Firebase</td></tr>';
    });
}

// Funciones globales para botones
window.editarProducto = (id) => {
    console.log("Editando:", id);
    // Aquí podrías abrir un modal de edición
};

window.desactivarProducto = (id) => {
    if(confirm("¿Deseas desactivar este producto del inventario?")) {
        console.log("Desactivando:", id);
        // Lógica para updateDoc en Firebase (estado: 'desactivado')
    }
};

// Iniciar proceso
inicializarSistema();