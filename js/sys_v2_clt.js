import { db } from './firebase-config.js';
import { collection, onSnapshot, doc, deleteDoc, serverTimestamp, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const ID_LICENCIA = localStorage.getItem('youcontrol_empresa_id');
let clientesMaster = [];

document.addEventListener('DOMContentLoaded', () => {
    // Selectores del DOM
    const formCliente = document.getElementById('form-cliente');
    const tablaClientes = document.getElementById('tabla-clientes');
    const inputCodigo = document.getElementById('cl-codigo');
    const inputBuscar = document.getElementById('buscar-cliente');
    const aviso = document.getElementById('aviso-no-registrado');

    // 1. Cargar datos en tiempo real
    if (ID_LICENCIA) {
        onSnapshot(collection(db, "usuarios", ID_LICENCIA, "clientes"), (snapshot) => {
            clientesMaster = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderizarTabla(clientesMaster);
        });
    }

    // 2. Buscador en Tabla
    inputBuscar.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtrados = clientesMaster.filter(c => 
            c.codigo?.toLowerCase().includes(term) || 
            c.nombre?.toLowerCase().includes(term) || 
            c.rif?.toLowerCase().includes(term)
        );
        renderizarTabla(filtrados);
    });

    // 3. Lógica Guardar
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
            alert("✅ Guardado correctamente");
            formCliente.reset();
            inputCodigo.readOnly = false;
        } catch (e) {
            console.error(e);
            alert("Error al guardar");
        }
    });

    function renderizarTabla(lista) {
        if (!tablaClientes) return;
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

// Funciones expuestas a window para que los botones onclick las encuentren
window.prepararEdicion = (id) => {
    const c = clientesMaster.find(x => x.id === id);
    if (c) {
        document.getElementById('cliente-id').value = c.id;
        document.getElementById('cl-codigo').value = c.codigo;
        document.getElementById('cl-codigo').readOnly = true;
        document.getElementById('cl-nombre').value = c.nombre;
        document.getElementById('cl-rif').value = c.rif || '';
        document.getElementById('cl-telefono').value = c.telefono || '';
        document.getElementById('cl-direccion').value = c.direccion || '';
        document.getElementById('form-title').innerHTML = `<i class="fas fa-user-edit"></i> Editando Cliente`;
        document.getElementById('btn-cancelar-edicion').style.display = 'block';
    }
};

window.eliminarCliente = async (id) => {
    if (confirm("¿Eliminar este cliente?")) {
        await deleteDoc(doc(db, "usuarios", ID_LICENCIA, "clientes", id));
    }
};
