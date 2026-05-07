import { db } from './firebase-config.js';
import { collection, getDocs, query, orderBy, doc, getDoc, where } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- CONFIGURACIÓN CRÍTICA ---
const MI_ID_USUARIO = "sUhfZI9Fy3M9UlInTYw2wFWZmB12"; // Lo sacas de Firebase > Authentication
const WHATSAPP_NUM = "5804245484324"; // Tu número ya configurado
// -----------------------------

let tasaDia = 1;

async function inicializarCatalogo() {
    // 1. Obtener la tasa de tu configuración
    const tasaRef = doc(db, "usuarios", MI_ID_USUARIO, "configuracion", "tasa"); 
    try {
        const tasaSnap = await getDoc(tasaRef);
        if (tasaSnap.exists()) {
            tasaDia = tasaSnap.data().valor;
            document.getElementById('tasa-cliente').innerText = tasaDia.toLocaleString('es-VE', {minimumFractionDigits: 2});
        }
    } catch (e) { console.error("Error tasa:", e); }

    cargarProductos();
}

async function cargarProductos() {
    const productosRef = collection(db, "usuarios", MI_ID_USUARIO, "productos");
    // Solo mostramos productos con stock mayor a 0
    const q = query(productosRef, where("stock", ">", 0), orderBy("stock", "desc"));
    
    try {
        const querySnapshot = await getDocs(q);
        const grid = document.getElementById('catalogo-productos');
        grid.innerHTML = "";

        querySnapshot.forEach((doc) => {
            const p = doc.data();
            const precioBs = (p.precio * tasaDia).toLocaleString('es-VE', { minimumFractionDigits: 2 });
            
            grid.innerHTML += `
                <div class="producto-card">
                    <div>
                        <h3 style="color: #1A1A2E; margin-bottom: 5px; font-family: 'Poppins'; font-size: 1.2rem;">${p.nombre}</h3>
                        <span class="badge ok" style="font-size: 10px;">DISPONIBLE</span>
                        <div class="precio-bs" style="font-size: 24px; font-weight: 800; color: #15803D; margin: 10px 0;">Bs. ${precioBs}</div>
                        <div class="precio-usd" style="font-weight: 600; color: #475569;">Ref: $${p.precio.toFixed(2)}</div>
                    </div>
                    <a href="https://wa.me/${WHATSAPP_NUM}?text=Hola! Me interesa comprar: ${p.nombre}" 
                       target="_blank" class="btn-primary" style="background-color: #25D366 !important; margin-top: 15px; text-decoration: none; justify-content: center;">
                       <i class="fab fa-whatsapp"></i> PEDIR POR WHATSAPP
                    </a>
                </div>
            `;
        });
    } catch (e) { console.error("Error productos:", e); }
}

inicializarCatalogo();
