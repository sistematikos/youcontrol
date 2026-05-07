import { auth, getUserRef, db } from './firebase-config.js';
import { addDoc, getDocs, query, orderBy, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let tasaDia = 0;

// 1. Función para obtener la tasa de la base de datos
async function obtenerTasa() {
    const user = auth.currentUser;
    const tasaRef = doc(db, "usuarios", user.uid, "configuracion", "tasa");
    const docSnap = await getDoc(tasaRef);

    if (docSnap.exists()) {
        tasaDia = docSnap.data().valor;
    } else {
        tasaDia = 1; // Valor por defecto si no existe
    }
    document.getElementById('tasa-actual').innerText = tasaDia.toLocaleString('es-VE', {minimumFractionDigits: 2});
    cargarInventario(); // Recargamos el inventario para que aplique la conversión
}

// 2. Función para que el usuario cambie la tasa
window.cambiarTasa = async () => {
    const nuevaTasa = prompt("Ingrese la tasa oficial de hoy (Bs.):", tasaDia);
    if (nuevaTasa && !isNaN(nuevaTasa)) {
        const user = auth.currentUser;
        const tasaRef = doc(db, "usuarios", user.uid, "configuracion", "tasa");
        
        await setDoc(tasaRef, { valor: Number(nuevaTasa), fecha: new Date() });
        obtenerTasa(); // Refrescar pantalla
    }
};

// 3. Modificamos el cargarInventario para incluir el cálculo
async function cargarInventario() {
    const ref = getUserRef("productos");
    if (!ref) return;

    const snap = await getDocs(query(ref, orderBy("nombre", "asc")));
    const listaContainer = document.getElementById('lista-productos');
    listaContainer.innerHTML = "";

    snap.forEach((doc) => {
        const p = doc.data();
        const stockClase = p.stock > 5 ? 'ok' : 'low';
        const precioBs = (p.precio * tasaDia).toLocaleString('es-VE', {minimumFractionDigits: 2});
        
        listaContainer.innerHTML += `
            <tr>
                <td style="font-weight: 700; color: var(--navy);">${p.nombre}</td>
                <td><span class="badge ${stockClase}">${p.stock}</span></td>
                <td style="font-weight: 700; color: var(--text);">$${p.precio}</td>
                <td style="font-weight: 800; color: #15803D;">Bs. ${precioBs}</td>
                <td>
                    <button class="btn-primary" style="padding: 6px 10px; font-size: 11px;">
                        <i class="fas fa-edit"></i>
                    </button>
                </td>
            </tr>
        `;
    });
}

// Actualizamos el disparador inicial
auth.onAuthStateChanged(user => { 
    if(user) obtenerTasa(); 
});
