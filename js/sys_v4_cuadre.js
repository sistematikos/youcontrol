import { db } from './firebase-config.js';
import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// CAMBIO CRÍTICO: Asegúrate que este ID sea EXACTAMENTE el que sale en la URL de tu Firebase
const USER_ID = "sUhfZI9Fy3M9UlInTYw2wFWZmB12"; 
const inputFecha = document.getElementById('filtro-fecha');
const tablaCuerpo = document.getElementById('tabla-cuerpo');

console.log("Iniciando conexión con usuario:", USER_ID);

function cargarCuadre(fechaSeleccionada) {
    // Apuntamos a la colección directamente
    const colRef = collection(db, "usuarios", USER_ID, "ventas");

    onSnapshot(colRef, (snapshot) => {
        console.log("Documentos encontrados en 'ventas':", snapshot.size);
        
        if (snapshot.empty) {
            tablaCuerpo.innerHTML = `<tr><td colspan="5">La colección 'ventas' está vacía o el ID de usuario es incorrecto.</td></tr>`;
            return;
        }

        // Imprimimos el primer documento para ver qué campos tiene
        const primerDoc = snapshot.docs[0].data();
        console.log("Estructura del primer documento:", primerDoc);

        let t = { usd: 0, efecBs: 0, punto: 0, pmovil: 0, global: 0 };
        tablaCuerpo.innerHTML = "";

        // Filtramos buscando el campo que vimos en tu captura: 'ultima_actualizacion'
        const registros = snapshot.docs.filter(doc => {
            const data = doc.data();
            // Comparamos el campo de la base de datos con la fecha del input
            return data.ultima_actualizacion === fechaSeleccionada;
        });

        if (registros.length === 0) {
            tablaCuerpo.innerHTML = `<tr><td colspan="5" style="text-align:center;">No hay ventas para ${fechaSeleccionada}</td></tr>`;
            return;
        }

        registros.forEach(doc => {
            const v = doc.data();
            const p = v.pagos || {}; 
            
            const usd = parseFloat(p.divisas_usd || 0);
            const punto = parseFloat(p.punto_bs || 0);
            
            t.usd += usd;
            t.punto += punto;

            tablaCuerpo.innerHTML += `<tr>
                <td>${v.hora || '--:--'}</td>
                <td>#${v.nro_factura || '---'}</td>
                <td>Punto: ${punto}</td>
                <td>$ ${usd.toFixed(2)}</td>
            </tr>`;
        });
    });
}

inputFecha.addEventListener('change', (e) => cargarCuadre(e.target.value));
// Carga inicial
inputFecha.value = new Date().toISOString().split('T')[0];
cargarCuadre(inputFecha.value);
