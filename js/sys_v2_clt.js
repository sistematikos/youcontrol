/**
 * YOU CONTROL - SISTEMATIKOS
 * Controlador de Gestión de Clientes en Firestore v2.1 (sys_v2_clt.js)
 * ACTUALIZADO: Guardado directo usando el RIF como ID del documento.
 */

import { db } from './firebase-config.js';
import { 
    collection, onSnapshot, doc, updateDoc, deleteDoc, serverTimestamp, getDoc, setDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const ID_LICENCIA = localStorage.getItem('youcontrol_empresa_id');

if (!ID_LICENCIA) console.error("Error: No se encontró ID de licencia.");

let clientesMaster = [];
let editMode = false;

const formCliente = document.getElementById('form-cliente');
const tablaClientes = document.getElementById('tabla-clientes');
const inputBuscar = document.getElementById('buscar-cliente');
const btnCancelar = document.getElementById('btn-cancelar-edicion');
const formTitle = document.getElementById('form-title');
const btnGuardar = document.getElementById('btn-guardar-cliente');
const empresaTitulo = document.getElementById('empresa-titulo'); 

// ==========================================
// 1. ESCUCHAR CLIENTES
// ==========================================
async function inicializarClientes() {
    if (!ID_LICENCIA) return;

    const empSnap = await getDoc(doc(db, "usuarios", ID_LICENCIA));
    if (empSnap.exists() && empresaTitulo) {
        empresaTitulo.innerText = empSnap.data().nombre_empresa || "CONTROL DE CLIENTES";
    }

    onSnapshot(collection(db, "usuarios", ID_LICENCIA, "clientes"), (snapshot) => {
        clientesMaster = [];
        snapshot.forEach((docSnap) => {
            clientesMaster.push({ id: docSnap.id, ...docSnap.data() });
        });
        clientesMaster.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
        renderizarTabla(clientesMaster);
    });
}

// ==========================================
// 2. REGISTRAR O ACTUALIZAR (CAMBIOS AQUÍ)
// ==========================================
if (formCliente) {
    formCliente.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!ID_LICENCIA) return;
        
        const nombre = document.getElementById('cl-nombre').value.trim().toUpperCase();
        const rif = document.getElementById('cl-rif').value.trim().toUpperCase();
        const telefono = document.getElementById('cl-telefono').value.trim();
        const direccion = document.getElementById('cl-direccion').value.trim().toUpperCase();

        if (!rif) { alert("El RIF es obligatorio para identificar al cliente"); return; }

        btnGuardar.disabled = true;
        btnGuardar.innerText = "PROCESANDO...";

        try {
            // USAMOS EL RIF COMO ID ÚNICO PARA GUARDAR DIRECTAMENTE
            const clienteRef = doc(db, "usuarios", ID_LICENCIA, "clientes", rif);
            
            if (editMode) {
                await updateDoc(clienteRef, {
                    nombre, rif, telefono, direccion,
                    fecha_modificacion: serverTimestamp()
                });
                alert("✅ Ficha actualizada");
            } else {
                await setDoc(clienteRef, {
                    nombre, rif, telefono, direccion,
                    fecha_creacion: serverTimestamp()
                });
                alert("✅ Cliente registrado");
            }
            cancelarEdicion();
        } catch (error) {
            console.error("Error:", error);
            alert("Error al guardar en la base de datos");
        }

        btnGuardar.disabled = false;
        btnGuardar.innerHTML = `<i class="fas fa-save"></i> GUARDAR CLIENTE`;
    });
}

// ==========================================
// 3. FUNCIONES DE EDICIÓN Y ELIMINACIÓN
// ==========================================
window.prepararEdicion = (id) => {
    const c = clientesMaster.find(x => x.id === id);
    if (!c) return;

    // Bloqueamos el RIF al editar para evitar que se rompa la referencia del ID
    document.getElementById('cl-rif').readOnly = true; 
    document.getElementById('cl-nombre').value = c.nombre;
    document.getElementById('cl-rif').value = c.rif;
    document.getElementById('cl-telefono').value = c.telefono || '';
    document.getElementById('cl-direccion').value = c.direccion || '';

    editMode = true;
    formTitle.innerHTML = `<i class="fas fa-user-edit"></i> Editar Cliente`;
    btnGuardar.innerHTML = `<i class="fas fa-sync-alt"></i> ACTUALIZAR FICHA`;
    if (btnCancelar) btnCancelar.style.display = 'block';
    formCliente.scrollIntoView({ behavior: 'smooth' });
};

window.eliminarCliente = async (id, nombre) => {
    if (confirm(`¿Eliminar a "${nombre}"?`)) {
        await deleteDoc(doc(db, "usuarios", ID_LICENCIA, "clientes", id));
    }
};

function cancelarEdicion() {
    formCliente.reset();
    document.getElementById('cl-rif').readOnly = false; // Permitir escribir RIF de nuevo
    editMode = false;
    formTitle.innerHTML = `<i class="fas fa-user-plus"></i> Registrar Cliente`;
    if (btnCancelar) btnCancelar.style.display = 'none';
}
// ... (resto de funciones de renderizado y búsqueda se mantienen igual)
