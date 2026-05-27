import { db } from './firebase-config.js';
import { collection, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const USER_ID = "sUhfZI9Fy3M9UlInTYw2wFWZmB12";
const inputFecha = document.getElementById('filtro-fecha');
const tablaCuerpo = document.getElementById('tabla-cuerpo');

// Inicializar con la fecha de hoy
inputFecha.value = new Date().toISOString().split('T')[0];

inputFecha.addEventListener('change', () => cargarCuadre(inputFecha.value));

function cargarCuadre(fecha) {
    const colRef = collection(db, "usuarios", USER_ID, "ventas");
    const q = query(colRef, where("fecha", "==", fecha));

    onSnapshot(q, (snapshot) => {
        let totales = { usd: 0, bs: 0, punto: 0, pmovil: 0 };
        tablaCuerpo.innerHTML = "";

        snapshot.forEach(doc => {
            const v = doc.data();
            const monto = parseFloat(v.monto || 0);
            
            // Lógica de suma según método
            if (v.metodo === "dolar") totales.usd += monto;
            if (v.metodo === "efectivo_bs") totales.bs += monto;
            if (v.metodo === "punto") totales.punto += monto;
            if (v.metodo === "pago_movil") totales.pmovil += monto;

            tablaCuerpo.innerHTML += `<tr>
                <td>${v.hora || '--:--'}</td>
                <td>${v.ref || '---'}</td>
                <td>${v.metodo}</td>
                <td>${monto.toFixed(2)}</td>
            </tr>`;
        });

        // Actualizar tarjetas
        document.getElementById('tot-usd').innerText = `$ ${totales.usd.toFixed(2)}`;
        document.getElementById('tot-bs').innerText = `Bs. ${totales.bs.toFixed(2)}`;
        document.getElementById('tot-punto').innerText = `Bs. ${totales.punto.toFixed(2)}`;
        document.getElementById('tot-pmovil').innerText = `Bs. ${totales.pmovil.toFixed(2)}`;
    });
}

// Carga inicial
cargarCuadre(inputFecha.value);
