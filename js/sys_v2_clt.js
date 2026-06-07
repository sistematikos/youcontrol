import { db } from './firebase-config.js';
import { collection, onSnapshot, doc, deleteDoc, serverTimestamp, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const ID_LICENCIA = localStorage.getItem('youcontrol_empresa_id');
let clientesMaster = [];
let indiceRes = -1;

// --- FUNCIONES GLOBALES (Definidas fuera para ser accesibles por los botones onclick) ---
window.renderizarTabla = (lista) => {
    const tabla = document.getElementById('tabla-clientes');
    if (!tabla) return;
    tabla.innerHTML = lista.map(c => `
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
};

window.cargarDatosCliente = (c) => {
    document.getElementById('cliente-id').value = c.id;
    document.getElementById('cl-codigo').value = c.codigo;
    document.getElementById('cl-codigo').readOnly = true;
    document.getElementById('cl-nombre').value = c.nombre;
    document.getElementById('cl-rif').value = c.rif || '';
    document.getElementById('cl-telefono').value = c.telefono || '';
    document.getElementById('cl-direccion').value = c.direccion || '';
    document.getElementById('btn-guardar-cliente').innerHTML = `<i class="fas fa-sync-alt"></i> ACTUALIZAR`;
    document.getElementById('btn-cancelar-edicion').style.display = 'block';
    document.getElementById('aviso-no-registrado').style.display = 'none';
    document.getElementById('cl-nombre').focus();
};

window.prepararEdicion = (id) => {
    const c = clientesMaster.find(x => x.id === id);
    if (c) window.cargarDatosCliente(c);
};

window.eliminarCliente = async (id) => {
    if (confirm("¿Eliminar este cliente?")) await deleteDoc(doc(db, "usuarios", ID_LICENCIA, "clientes", id));
};

// --- LÓGICA PRINCIPAL ---
document.addEventListener('DOMContentLoaded', () => {
    const formCliente = document.getElementById('form-cliente');
    const inputCodigo = document.getElementById('cl-codigo');
    const inputBuscar = document.getElementById('buscar-cliente');
    const listaResultados = document.getElementById('lista-resultados');

    // 1. Carga inicial
    onSnapshot(collection(db, "usuarios", ID_LICENCIA, "clientes"), (snapshot) => {
        clientesMaster = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        window.renderizarTabla(clientesMaster);
    });

    // 2. Buscador inteligente (Input)
    inputCodigo.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        indiceRes = -1;
        if (term.length < 2) { if(listaResultados) listaResultados.style.display = 'none'; return; }
        
        const filtrados = clientesMaster.filter(c => c.nombre?.toLowerCase().includes(term) || c.codigo?.toLowerCase().includes(term));
        
        if (listaResultados && filtrados.length > 0) {
            listaResultados.style.display = 'block';
            listaResultados.innerHTML = filtrados.map((c, i) => `
                <div class="item-res" id="res-${i}" onclick="window.cargarDatosCliente(clientesMaster.find(x=>x.id=='${c.id}')); listaResultados.style.display='none';" style="padding:10px; cursor:pointer;">
                    ${c.nombre} (Cod: ${c.codigo})
                </div>
            `).join('');
        }
    });

    // 3. Teclado
    inputCodigo.addEventListener('keydown', (e) => {
        if (!listaResultados) return;
        const items = listaResultados.querySelectorAll('.item-res');
        
        if (e.key === 'Enter') {
            e.preventDefault();
            const term = inputCodigo.value.trim().toUpperCase();
            const cliente = clientesMaster.find(c => c.codigo?.toUpperCase() === term);
            if (cliente) {
                window.cargarDatosCliente(cliente);
                listaResultados.style.display = 'none';
            } else {
                document.getElementById('aviso-no-registrado').style.display = 'block';
                document.getElementById('cl-nombre').focus();
            }
        }
    });

    // 4. Guardar
    formCliente.addEventListener('submit', async (e) => {
        e.preventDefault();
        const codigo = inputCodigo.value.trim().toUpperCase();
        try {
            await setDoc(doc(db, "usuarios", ID_LICENCIA, "clientes", codigo), {
                codigo,
                nombre: document.getElementById('cl-nombre').value.trim().toUpperCase(),
                rif: document.getElementById('cl-rif').value.trim().toUpperCase(),
                telefono: document.getElementById('cl-telefono').value.trim(),
                direccion: document.getElementById('cl-direccion').value.trim().toUpperCase(),
                updatedAt: serverTimestamp()
            }, { merge: true });
            alert("✅ Guardado");
            formCliente.reset();
            inputCodigo.readOnly = false;
        } catch (e) { alert("Error: " + e.message); }
    });
});
