import { db } from './firebase-config.js';
import { collection, onSnapshot, doc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const UID = "sUhfZI9Fy3M9UlInTYw2wFWZmB12";
let tasaActual = 0;

// 1. ESCUCHAR LA TASA (Ruta exacta según tu imagen)
function iniciarSistema() {
    // Apuntamos al documento 'tasa' dentro de la sub-colección 'configuracion'
    const tasaRef = doc(db, "usuarios", UID, "configuracion", "tasa");

    onSnapshot(tasaRef, (snap) => {
        if (snap.exists()) {
            const datos = snap.data();
            tasaActual = datos.valor; // Extrae el campo 'valor' (496.84)
            
            // Actualizar el header
            const tasaElemento = document.getElementById('tasa-valor');
            if (tasaElemento) {
                tasaElemento.innerText = tasaActual.toLocaleString('es-VE', { minimumFractionDigits: 2 }) + " Bs.";
            }
            
            // Refrescar la tabla de productos con la nueva tasa
            cargarProductos();
        } else {
            console.warn("No se encontró el documento de tasa");
        }
    });
}

// 2. CARGAR PRODUCTOS (Sub-colección 'productos')
function cargarProductos() {
    const productosRef = collection(db, "usuarios", UID, "productos");
    const tabla = document.getElementById('tabla-inventario');

    onSnapshot(productosRef, (snapshot) => {
        tabla.innerHTML = "";

        if (snapshot.empty) {
            tabla.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px;">No hay productos registrados</td></tr>';
            return;
        }

        snapshot.forEach((docSnap) => {
            const p = docSnap.data();
            const id = docSnap.id;
            
            // Cálculo del precio en Bolívares
            const precioBs = (p.precio * tasaActual).toLocaleString('es-VE', { minimumFractionDigits: 2 });

            tabla.innerHTML += `
                <tr>
                    <td>
                        <span class="prod-name" style="font-weight:700; display:block;">${p.nombre || 'Sin nombre'}</span>
                        <span class="prod-code" style="font-size:0.75rem; color:#94A3B8; font-family:monospace;">
                            <i class="fas fa-barcode"></i> ${p.codigo || 'S/C'}
                        </span>
                    </td>
                    <td><span class="badge-stock" style="background:#F1F5F9; padding:5px 12px; border-radius:8px; font-weight:800;">${p.stock || 0}</span></td>
                    <td style="font-weight:600;">$${parseFloat(p.precio || 0).toFixed(2)}</td>
                    <td style="color:#3B82F6; font-weight:900;">${precioBs} Bs.</td>
                    <td style="text-align: center;">
                        <button onclick="editar('${id}')" style="color:#3B82F6; border:none; background:none; cursor:pointer; font-size:1.1rem;"><i class="fas fa-edit"></i></button>
                        <button onclick="desactivar('${id}')" style="color:#EF4444; border:none; background:none; cursor:pointer; font-size:1.1rem; margin-left:10px;"><i class="fas fa-eye-slash"></i></button>
                    </td>
                </tr>
            `;
        });
    });
}

// Iniciar proceso al cargar
iniciarSistema();
