/**
 * YOU CONTROL - SISTEMATIKOS
 * Controlador de Gestión de Clientes en Firestore v2.3
 */

import { db } from './firebase-config.js';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, serverTimestamp, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const ID_LICENCIA = localStorage.getItem('youcontrol_empresa_id');
if (!ID_LICENCIA) console.error("Error: No se encontró ID de licencia.");

let clientesMaster = [];
let editMode = false;

// Elementos DOM
const formCliente = document.getElementById('form-cliente');
const tablaClientes = document.getElementById('tabla-clientes');
const inputBuscar = document.getElementById('buscar-cliente');
const btnCancelar = document.getElementById('btn-cancelar-edicion');
const formTitle = document.getElementById('form-title');
const btnGuardar = document.getElementById('btn-guardar-cliente');
const inputCodigo = document.getElementById('cl-codigo');
const inputNombre = document.getElementById('cl-nombre');
const aviso = document.getElementById('aviso-no-registrado');

// ==========================================
// 1. BUSCADOR INTELIGENTE (ENTER EN CÓDIGO)
// ==========================================
inputCodigo.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        const codigo = inputCodigo.value.trim().toUpperCase();
        const cliente = clientesMaster.find(c => c.codigo === codigo);
        
        if (cliente) {
            aviso.style.display = 'none';
            cargarDatosCliente(cliente);
        } else {
            aviso.style.display = 'block';
            inputNombre.focus();
        }
    }
});

function cargarDatosCliente(cl) {
    document.getElementById('cliente-id').value = cl.id;
    inputNombre.value = cl.nombre;
    document.getElementById('cl-rif').value = cl.rif || '';
    document.getElementById('cl-telefono').value = cl.telefono || '';
    document.getElementById('cl-direccion').value = cl.direccion || '';
    inputCodigo.readOnly = true;
    editMode = true;
    formTitle.innerHTML = `<i class="fas fa-user-edit"></i> Editar Cliente`;
    btnGuardar.innerHTML = `<i class="fas fa-sync-alt"></i> ACTUALIZAR CLIENTE`;
    if (btnCancelar) btnCancelar.style.display = 'block';
    inputNombre.focus();
}

// ==========================================
// 2. ESCUCHAR CLIENTES
// ==========================================
onSnapshot(collection(db, "usuarios", ID_LICENCIA, "clientes"), (snapshot) => {
    clientesMaster = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderizarTabla(clientesMaster);
});

// ==========================================
// 3. RENDERIZAR TABLA
// ==========================================
function renderizarTabla(lista) {
    if (!tablaClientes) return;
    tablaClientes.innerHTML = lista.map(c => `
        <tr>
            <td>${c.codigo || 'N/A'}</td>
            <td><b>${c.nombre || 'N/A'}</b></td>
            <td>${c.rif || '-'}</td>
            <td style="text-align:center;">
                <button class="btn-table" onclick="window.prepararEdicion('${c.id}')"><i class="fas fa-edit"></i></button>
                <button class="btn-table" onclick="window.eliminarCliente('${c.id}', '${c.nombre}')"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

// ==========================================
// 4. GUARDAR / ACTUALIZAR
// ==========================================
formCliente.addEventListener('submit', async (e) => {
    e.preventDefault();
    const codigo = inputCodigo.value.trim().toUpperCase();
    const datos = {
        codigo,
        nombre: inputNombre.value.trim().toUpperCase(),
        rif: document.getElementById('cl-rif').value.trim().toUpperCase(),
        telefono: document.getElementById('cl-telefono').value.trim(),
        direccion: document.getElementById('cl-direccion').value.trim().toUpperCase()
    };

    try {
        await setDoc(doc(db, "usuarios", ID_LICENCIA, "clientes", codigo), { ...datos, updatedAt: serverTimestamp() });
        alert("✅ Operación exitosa");
        cancelarEdicion();
    } catch (e) { alert("Error al guardar: " + e.message); }
});

// ==========================================
// 5. UTILIDADES
// ==========================================
window.prepararEdicion = (id) => {
    const c = clientesMaster.find(x => x.id === id);
    if (c) cargarDatosCliente(c);
};

window.eliminarCliente = async (id, nombre) => {
    if (confirm(`¿Eliminar a "${nombre}"?`)) {
        await deleteDoc(doc(db, "usuarios", ID_LICENCIA, "clientes", id));
    }
};

function cancelarEdicion() {
    formCliente.reset();
    inputCodigo.readOnly = false;
    editMode = false;
    aviso.style.display = 'none';
    formTitle.innerHTML = `<i class="fas fa-user-plus"></i> Registrar Cliente`;
    if (btnCancelar) btnCancelar.style.display = 'none';
    btnGuardar.innerHTML = `<i class="fas fa-save"></i> GUARDAR CLIENTE`;
    inputCodigo.focus();
}

if (btnCancelar) btnCancelar.addEventListener('click', cancelarEdicion);

// Buscador tabla
inputBuscar.addEventListener('input', (e) => {
    const val = e.target.value.toLowerCase();
    document.querySelectorAll('#tabla-clientes tr').forEach(tr => {
        tr.style.display = tr.textContent.toLowerCase().includes(val) ? '' : 'none';
    });
});
