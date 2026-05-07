import { auth, getUserRef, db } from './firebase-config.js';
import { addDoc, getDocs, query, orderBy, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

let tasaDia = 1; // Valor base

// 1. OBTENER TASA DESDE FIREBASE
async function obtenerTasa() {
    const user = auth.currentUser;
    if (!user) return;

    const tasaRef = doc(db, "usuarios", user.uid, "configuracion", "tasa");
    const docSnap = await getDoc(tasaRef);

    if (docSnap.exists()) {
        tasaDia = docSnap.data().valor;
    }
    
    // Formatear visualmente la tasa en el banner
    document.getElementById('tasa-actual').innerText = tasaDia.toFixed(2);
    cargarInventario(); // Cargar productos una vez tenemos la tasa
}

// 2. CAMBIAR TASA (Botón Actualizar)
window.cambiarTasa = async () => {
    const nueva = prompt("Ingrese la tasa BCV o Paralela de hoy:", tasaDia);
    if (nueva && !isNaN(nueva)) {
        const user = auth.currentUser;
        const tasaRef = doc(db, "usuarios", user.uid, "configuracion", "tasa");
        
        await setDoc(tasaRef, { valor: Number(nueva), fecha: new Date() });
        obtenerTasa(); // Refrescar vista
    }
};

// 3. CARGAR INVENTARIO CON CONVERSIÓN
async function cargarInventario() {
    const ref = getUserRef("productos");
    if (!ref) return;

    const snap = await getDocs(query(ref, orderBy("nombre", "asc")));
    const listaContainer = document.getElementById('lista-productos');
    listaContainer.innerHTML = "";

    snap.forEach((doc) => {
        const p = doc.data();
        const stockClase = p.stock > 5 ? 'ok' : 'low';
        
        // Cálculo de Bolívares
        const precioBs = (p.precio * tasaDia).toLocaleString('es-VE', { minimumFractionDigits: 2 });

        listaContainer.innerHTML += `
            <tr>
                <td style="font-weight: 700; color: var(--navy);">${p.nombre}</td>
                <td><span class="badge ${stockClase}">${p.stock}</span></td>
                <td style="font-weight: 700; color: var(--text);">$${p.precio}</td>
                <td style="font-weight: 800; color: #15803D; background: rgba(21,128,61,0.05);">Bs. ${precioBs}</td>
                <td>
                    <button class="btn-primary" style="padding: 6px 10px; font-size: 11px; background: var(--navy);">
                        <i class="fas fa-edit"></i>
                    </button>
                </td>
            </tr>
        `;
    });
}

// INICIO DE LA APP
auth.onAuthStateChanged(user => {
    if (user) {
        obtenerTasa();
    } else {
        window.location.assign("index.html");
    }
});

// EVENTO GUARDAR NUEVO
if (document.getElementById('form-nuevo-producto')) {
    document.getElementById('form-nuevo-producto').addEventListener('submit', async (e) => {
        e.preventDefault();
        await addDoc(getUserRef("productos"), {
            nombre: document.getElementById('p-nombre').value,
            stock: Number(document.getElementById('p-stock').value),
            precio: Number(document.getElementById('p-precio').value),
            fecha: new Date()
        });
        document.getElementById('modal-prod').style.display = 'none';
        e.target.reset();
        cargarInventario();
    });
}

document.getElementById('btn-logout').onclick = () => signOut(auth);
