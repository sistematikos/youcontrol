import { db } from './firebase-config.js';
import { collection, doc, onSnapshot, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const USER_ID = "sUhfZI9Fy3M9UlInTYw2wFWZmB12";

// Función para iniciar todo con seguridad
async function iniciarCatalogo() {
    try {
        // 1. Obtener tasa con getDoc (más estable que onSnapshot para el inicio)
        const userDoc = await getDoc(doc(db, "usuarios", USER_ID));
        if (userDoc.exists()) {
            const data = userDoc.data();
            const tasa = data.tasa_bcv || 1;
            document.getElementById('tasa-cliente').innerText = tasa.toLocaleString('es-VE', {minimumFractionDigits:2});
            
            // 2. Cargar productos solo después de obtener la tasa
            cargarProductos(tasa);
        } else {
            console.error("No se encontró el documento del usuario");
        }
    } catch (e) {
        console.error("Error al conectar con Firebase:", e);
    }
}

function cargarProductos(tasa) {
    onSnapshot(collection(db, "usuarios", USER_ID, "productos"), (snap) => {
        const contenedor = document.getElementById('contenedor-catalogo');
        contenedor.innerHTML = ""; // Limpiar
        
        snap.forEach(d => {
            const p = d.data();
            if ((p.stock || 0) > 0) {
                const precioBs = (p.precio * tasa).toLocaleString('es-VE', {minimumFractionDigits:2});
                contenedor.innerHTML += `
                <div class="card-prod" id="card-${d.id}">
                    <h3>${p.nombre}</h3>
                    <span class="price-bs">${precioBs} Bs</span>
                    <button onclick="cambiarCant('${d.id}', 1, '${p.nombre}', ${p.precio}, ${p.stock})">+</button>
                </div>`;
            }
        });
    });
}
