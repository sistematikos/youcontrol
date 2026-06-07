import { db } from './firebase-config.js';
import { collection, onSnapshot, doc, deleteDoc, serverTimestamp, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const ID_LICENCIA = localStorage.getItem('youcontrol_empresa_id');
let clientesMaster = [];

document.addEventListener('DOMContentLoaded', () => {
    const formCliente = document.getElementById('form-cliente');
    const tablaClientes = document.getElementById('tabla-clientes');
    const inputCodigo = document.getElementById('cl-codigo');

    if (!formCliente || !tablaClientes || !inputCodigo) {
        console.error("Error: Elementos del DOM no encontrados. Verifica los IDs en tu HTML.");
        return;
    }

    // 1. Escuchar clientes en tiempo real
    onSnapshot(collection(db, "usuarios", ID_LICENCIA, "clientes"), (snapshot) => {
        clientesMaster = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderizarTabla(clientesMaster);
    });

    // 2. Guardar Cliente
    formCliente.addEventListener('submit', async (e) => {
        e.preventDefault();
        const codigo = inputCodigo.value.trim().toUpperCase();
        
        try {
            await setDoc(doc(db, "usuarios", ID_LICENCIA, "clientes", codigo), {
                codigo: codigo,
                nombre: document.getElementById('cl-nombre').value.trim().toUpperCase(),
                rif: document.getElementById('cl-rif').value.trim().toUpperCase(),
                telefono: document.getElementById('cl-telefono').value.trim(),
                direccion: document.getElementById('cl-direccion').value.trim().toUpperCase(),
                updatedAt: serverTimestamp()
            }, { merge: true });
            alert("✅ Operación exitosa");
            formCliente.reset();
            inputCodigo.readOnly = false;
        } catch (e) {
            console.error(e);
            alert("Error al guardar");
        }
    });

    function renderizarTabla(lista) {
        tablaClientes.innerHTML = lista.map(c => `
            <tr>
                <td>${c.codigo}</td>
                <td><b>${c.nombre}</b></td>
                <td>${c.rif || '-'}</td>
                <td>
                    <button class="btn-table" onclick="window.prepararEdicion('${c.id}')"><i class="fas fa-edit"></i></button>
                    <button class="btn-table" onclick="window.eliminarCliente('${c.id}')"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `).join('');
    }
});

// Funciones globales accesibles por el HTML
window.prepararEdicion = (id) => {
    const c = clientesMaster.find(x => x.id === id);
    if (c) {
        document.getElementById('cl-codigo').value = c.codigo;
        document.getElementById('cl-codigo').readOnly = true;
        document.getElementById('cl-nombre').value = c.nombre;
        document.getElementById('cl-rif').value = c.rif || '';
        document.getElementById('cl-telefono').value = c.telefono || '';
        document.getElementById('cl-direccion').value = c.direccion || '';
    }
};

window.eliminarCliente = async (id) => {
    if (confirm("¿Eliminar este cliente?")) {
        await deleteDoc(doc(db, "usuarios", ID_LICENCIA, "clientes", id));
    }
};
