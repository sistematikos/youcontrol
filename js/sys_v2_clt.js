/**
 * YOU CONTROL - SISTEMATIKOS
 * Controlador de Gestión de Clientes en Firestore v2.0 (sys_v2_clt.js)
 */

import { db } from './firebase-config.js';
import { 
    collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc, serverTimestamp, getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// CAMBIO: ID de la licencia o empresa actual
const ID_LICENCIA = "YC-2026-001"; 

let clientesMaster = [];
let editMode = false;

const formCliente = document.getElementById('form-cliente');
const tablaClientes = document.getElementById('tabla-clientes');
const inputBuscar = document.getElementById('buscar-cliente');
const btnCancelar = document.getElementById('btn-cancelar-edicion');
const formTitle = document.getElementById('form-title');
const btnGuardar = document.getElementById('btn-guardar-cliente');
// Nuevo elemento para mostrar el nombre
const empresaTitulo = document.getElementById('empresa-titulo'); 

// ==========================================
// 1. ESCUCHAR CLIENTES Y CARGAR EMPRESA
// ==========================================
async function inicializarClientes() {
    // Cargar nombre de empresa
    const empRef = doc(db, "usuarios", ID_LICENCIA);
    const empSnap = await getDoc(empRef);
    if (empSnap.exists() && empresaTitulo) {
        empresaTitulo.innerText = empSnap.data().nombre_empresa || "CONTROL DE CLIENTES";
    }

    // Escuchar clientes bajo la ruta dinámica
    const clientesRef = collection(db, "usuarios", ID_LICENCIA, "clientes");
    
    onSnapshot(clientesRef, (snapshot) => {
        clientesMaster = [];
        snapshot.forEach((docSnap) => {
            clientesMaster.push({ id: docSnap.id, ...docSnap.data() });
        });
        
        clientesMaster.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
        renderizarTabla(clientesMaster);
    });
}

// ==========================================
// 2. RENDERIZAR TABLA DE CLIENTES
// ==========================================
function renderizarTabla(lista) {
    if (!tablaClientes) return;
    
    if (lista.length === 0) {
        tablaClientes.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#94A3B8; font-weight:600; padding:30px;">Ningún cliente registrado en ${empresaTitulo?.innerText || 'esta empresa'}.</td></tr>`;
        return;
    }

    tablaClientes.innerHTML = lista.map(c => {
        return `
            <tr>
                <td><b style="color:#0F172A;">${c.nombre}</b></td>
                <td><span class="badge-rif">${c.rif || 'S/R'}</span></td>
                <td style="font-weight:600; color:#334155;">${c.telefono || 'S/T'}</td>
                <td style="font-size:0.85rem; color:#64748B;">${c.direccion || 'S/D'}</td>
                <td style="text-align: center; white-space: nowrap;">
                    <button class="btn-table btn-edit" onclick="window.prepararEdicion('${c.id}')" title="Editar Ficha">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-table btn-delete" onclick="window.eliminarCliente('${c.id}', '${c.nombre}')" title="Eliminar de Cartera">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// ==========================================
// 3. REGISTRAR O ACTUALIZAR CLIENTE (CRUD)
// ==========================================
if (formCliente) {
    formCliente.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const id = document.getElementById('cliente-id').value;
        const nombre = document.getElementById('cl-nombre').value.trim().toUpperCase();
        const rif = document.getElementById('cl-rif').value.trim().toUpperCase();
        const telefono = document.getElementById('cl-telefono').value.trim();
        const direccion = document.getElementById('cl-direccion').value.trim().toUpperCase();

        btnGuardar.disabled = true;
        btnGuardar.innerText = "PROCESANDO...";

        try {
            if (editMode) {
                // Actualizar bajo la ruta dinámica
                const clienteRef = doc(db, "usuarios", ID_LICENCIA, "clientes", id);
                await updateDoc(clienteRef, {
                    nombre, rif, telefono, direccion,
                    fecha_modificacion: serverTimestamp()
                });
                alert("✅ Ficha de cliente actualizada correctamente");
                cancelarEdicion();
            } else {
                // Insertar bajo la ruta dinámica
                const clientesRef = collection(db, "usuarios", ID_LICENCIA, "clientes");
                await addDoc(clientesRef, {
                    nombre, rif, telefono, direccion,
                    fecha_creacion: serverTimestamp()
                });
                alert("✅ Cliente registrado con éxito");
                formCliente.reset();
            }
        } catch (error) {
            console.error("Error:", error);
            alert("Error al interactuar con Firebase");
        }

        btnGuardar.disabled = false;
        btnGuardar.innerHTML = `<i class="fas fa-save"></i> GUARDAR CLIENTE`;
    });
}

// ==========================================
// 4. FUNCIONES GLOBALES PARA LA TABLA (WINDOW)
// ==========================================
window.prepararEdicion = (id) => {
    const c = clientesMaster.find(x => x.id === id);
    if (!c) return;

    document.getElementById('cliente-id').value = c.id;
    document.getElementById('cl-nombre').value = c.nombre;
    document.getElementById('cl-rif').value = c.rif || '';
    document.getElementById('cl-telefono').value = c.telefono || '';
    document.getElementById('cl-direccion').value = c.direccion || '';

    editMode = true;
    formTitle.innerHTML = `<i class="fas fa-user-edit"></i> Editar Cliente`;
    btnGuardar.innerHTML = `<i class="fas fa-sync-alt"></i> ACTUALIZAR FICHA`;
    if (btnCancelar) btnCancelar.style.display = 'block';
    
    formCliente.scrollIntoView({ behavior: 'smooth' });
};

window.eliminarCliente = async (id, nombre) => {
    if (confirm(`¿Está seguro de que desea eliminar al cliente "${nombre}"?`)) {
        try {
            const clienteRef = doc(db, "usuarios", ID_LICENCIA, "clientes", id);
            await deleteDoc(clienteRef);
            alert("🗑️ Cliente removido con éxito");
        } catch (error) {
            console.error(error);
            alert("No se pudo eliminar.");
        }
    }
};

function cancelarEdicion() {
    formCliente.reset();
    document.getElementById('cliente-id').value = '';
    editMode = false;
    formTitle.innerHTML = `<i class="fas fa-user-plus"></i> Registrar Cliente`;
    btnGuardar.innerHTML = `<i class="fas fa-save"></i> GUARDAR CLIENTE`;
    if (btnCancelar) btnCancelar.style.display = 'none';
}

if (btnCancelar) btnCancelar.addEventListener('click', cancelarEdicion);

// ==========================================
// 5. FILTRO DE BÚSQUEDA Y ARRANQUE
// ==========================================
if (inputBuscar) {
    inputBuscar.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        const filtrados = clientesMaster.filter(c => {
            return (c.nombre || '').toLowerCase().includes(query) || 
                   (c.rif || '').toLowerCase().includes(query) || 
                   (c.telefono || '').toLowerCase().includes(query);
        });
        renderizarTabla(filtrados);
    });
}

inicializarClientes();
