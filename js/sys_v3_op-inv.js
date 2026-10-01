import { auth, db } from './firebase_config.js'; // Ajusta a tu archivo de configuración
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let listaProductos = [];

const inputBuscador = document.getElementById('buscador-prod-inv');
const listaResultados = document.getElementById('lista-resultados-inv');

// 1. Escuchar la sesión de Firebase
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        console.warn("No hay usuario autenticado.");
        window.location.href = 'index.html';
        return;
    }

    console.log("Usuario autenticado UID:", user.uid);
    await cargarProductos(user.uid);
});

// 2. Cargar los productos guardados en Firebase
async function cargarProductos(uid) {
    try {
        listaProductos = [];
        
        // Consultar productos del usuario
        // Si no usas campo 'userId', puedes usar: collection(db, "productos")
        const q = query(collection(db, "productos"), where("userId", "==", uid));
        const querySnapshot = await getDocs(q);

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            listaProductos.push({
                id: doc.id,
                // Mapeo flexible por si varían los nombres de campos guardados
                sku: data.sku || data.codigo || data.id || '',
                nombre: data.nombre || data.descripcion || data.producto || 'Sin Nombre',
                barras: data.barras || data.codigoBarras || '',
                stock: data.stock !== undefined ? data.stock : (data.existencia || 0)
            });
        });

        console.log("Productos cargados exitosamente:", listaProductos);
    } catch (error) {
        console.error("Error leyendo Firebase:", error);
        
        // Respaldo: Si falla la consulta filtrada, intenta traer la colección directa
        try {
            const snap = await getDocs(collection(db, "productos"));
            listaProductos = [];
            snap.forEach(doc => {
                const data = doc.data();
                listaProductos.push({
                    id: doc.id,
                    sku: data.sku || data.codigo || doc.id,
                    nombre: data.nombre || data.descripcion || 'Sin Nombre',
                    barras: data.barras || '',
                    stock: data.stock ?? 0
                });
            });
            console.log("Cargado por respaldo general:", listaProductos);
        } catch (e) {
            console.error("Fallo total al cargar productos:", e);
        }
    }
}

// 3. Filtrar en tiempo real al escribir
if (inputBuscador) {
    inputBuscador.addEventListener('input', (e) => {
        const texto = e.target.value.trim().toLowerCase();

        if (texto === '') {
            ocultarLista();
            return;
        }

        const resultados = listaProductos.filter(p => 
            p.nombre.toLowerCase().includes(texto) ||
            p.sku.toLowerCase().includes(texto) ||
            p.barras.toLowerCase().includes(texto)
        );

        mostrarLista(resultados);
    });
}

// 4. Renderizar el menú flotante
function mostrarLista(items) {
    if (!listaResultados) return;
    listaResultados.innerHTML = '';

    if (items.length === 0) {
        listaResultados.innerHTML = `<div class="item-res-inv" style="color:#94A3B8;"><small>No hay coincidencias</small></div>`;
        listaResultados.style.display = 'block';
        return;
    }

    items.slice(0, 10).forEach(prod => {
        const div = document.createElement('div');
        div.className = 'item-res-inv';
        div.innerHTML = `
            <strong>${prod.nombre}</strong><br>
            <small>SKU: ${prod.sku} | Stock: ${prod.stock}</small>
        `;

        // Usar pointerdown evita que se pierda el clic al hacer foco fuera
        div.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            seleccionar(prod);
        });

        listaResultados.appendChild(div);
    });

    listaResultados.style.display = 'block';
}

// 5. Asignar el producto elegido a los campos
function seleccionar(prod) {
    inputBuscador.value = prod.nombre;
    
    const campoSku = document.getElementById('inv-sku');
    const campoNombre = document.getElementById('inv-nombre');
    const campoStock = document.getElementById('inv-stock-actual');

    if (campoSku) campoSku.value = prod.sku;
    if (campoNombre) campoNombre.value = prod.nombre;
    if (campoStock) campoStock.value = prod.stock;

    ocultarLista();
}

function ocultarLista() {
    if (listaResultados) {
        listaResultados.style.display = 'none';
        listaResultados.innerHTML = '';
    }
}

// Ocultar si hace clic en cualquier otra parte de la pantalla
document.addEventListener('click', (e) => {
    if (inputBuscador && !inputBuscador.contains(e.target) && listaResultados && !listaResultados.contains(e.target)) {
        ocultarLista();
    }
});
