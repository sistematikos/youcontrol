import { db } from './firebase-config.js';
import { collection, query, orderBy, limit, getDocs, doc, updateDoc, increment } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Suponiendo que tienes un ID de empresa guardado en localStorage
const USER_ID = localStorage.getItem('youcontrol_empresa_id');

async function cargarFacturas() {
    const listaEl = document.getElementById('lista-facturas');
    const q = query(collection(db, "usuarios", USER_ID, "facturas"), orderBy("fecha", "desc"), limit(20));
    
    const snap = await getDocs(q);
    listaEl.innerHTML = "";
    
    snap.forEach(fDoc => {
        const f = fDoc.data();
        const div = document.createElement('div');
        div.className = "factura-card";
        div.innerHTML = `
            <div>
                <strong>Factura: ${fDoc.id.slice(-5)}</strong><br>
                <small>${f.fecha?.toDate().toLocaleString() || 'Fecha no disponible'}</small>
            </div>
            <div>
                ${f.estado === 'anulada' ? '<span>❌ ANULADA</span>' : 
                `<button class="btn-anular" onclick="anular('${fDoc.id}')">Anular</button>`}
            </div>
        `;
        listaEl.appendChild(div);
    });
}

window.anular = async function(id) {
    // Aquí implementaremos la lógica de devolver stock
    console.log("Anulando factura:", id);
};

cargarFacturas();
