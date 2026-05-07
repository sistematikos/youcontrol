import { db } from './firebase-config.js';
import { collection, getDocs, query, orderBy, doc, getDoc, where } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let tasaDia = 1;
const WHATSAPP_NUM = "584241234567"; // Reemplaza con tu número real

async function inicializarCatalogo() {
    // 1. Obtener la tasa (Asumimos que está en una ruta pública o fija para el dueño)
    // Nota: Aquí deberás ajustar la ruta del doc según cómo guardes la tasa del admin
    const tasaRef = doc(db, "usuarios", "TU_UID_AQUI", "configuracion", "tasa"); 
    const tasaSnap = await getDoc(tasaRef);
    if (tasaSnap.exists()) {
        tasaDia = tasaSnap.data().valor;
        document.getElementById('tasa-cliente').innerText = tasaDia.toFixed(2);
    }

    cargarProductos();
}

async function cargarProductos() {
    // 2. Consultar solo productos con stock > 0
    const productosRef = collection(db, "usuarios", "TU_UID_AQUI", "productos");
    const q = query(productosRef, where("stock", ">", 0), orderBy("stock", "desc"));
    
    const querySnapshot = await getDocs(q);
    const grid = document.getElementById('catalogo-productos');
    grid.innerHTML = "";

    querySnapshot.forEach((doc) => {
        const p = doc.data();
        const precioBs = (p.precio * tasaDia).toLocaleString('es-VE', { minimumFractionDigits: 2 });
        
        grid.innerHTML += `
            <div class="producto-card">
                <div>
                    <h3 style="color: var(--navy); margin-bottom: 5px; font-family: 'Poppins';">${p.nombre}</h3>
                    <span style="font-size: 12px; color: var(--text); text-transform: uppercase; font-weight: 700;">Disponible: ${p.stock}</span>
                    <div class="precio-bs">Bs. ${precioBs}</div>
                    <div class="precio-usd">$${p.precio.toFixed(2)}</div>
                </div>
                <a href="https://wa.me/${WHATSAPP_NUM}?text=Hola! Me interesa el producto: ${p.nombre}" 
                   target="_blank" class="btn-primary btn-whatsapp">
                   <i class="fab fa-whatsapp"></i> PEDIR AHORA
                </a>
            </div>
        `;
    });
}

// Inicializar
inicializarCatalogo();