import { db } from './firebase-config.js';
import { 
    collection, 
    onSnapshot, 
    doc, 
    deleteDoc, 
    serverTimestamp, 
    setDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const ID_LICENCIA = localStorage.getItem('youcontrol_empresa_id');
let proveedoresMaster = [];
let indiceRes = -1;

// --- FUNCIONES GLOBALES (Para el DOM) ---
window.cargarDatosProveedor = (p) => {
    document.getElementById('prov-id').value = p.id;
    document.getElementById('prov-codigo').value = p.codigo;
    document.getElementById('prov-codigo').readOnly = true;
    document.getElementById('prov-nombre').value = p.nombre;
    document.getElementById('prov-rif').value = p.rif || '';
    document.getElementById('prov-contacto').value = p.contacto || '';
    document.getElementById('prov-telefono').value = p.telefono || '';
    document.getElementById('prov-direccion').value = p.direccion || '';
    
    document.getElementById('btn-guardar-proveedor').innerHTML = `<i class="fas fa-sync-alt"></i> ACTUALIZAR PROVEEDOR`;
    document.getElementById('btn-cancelar-edicion').style.display = 'block';
    document.getElementById('aviso-no-registrado').style.display = 'none';
    document.getElementById('prov-nombre').focus();
    
    const list = document.getElementById('lista-resultados');
    if(list) list.style.display = 'none';
};

window.prepararEdicion = (id) => {
    const p = proveedoresMaster.find(x => x.id === id);
    if (p) window.cargarDatosProveedor(p);
};

window.eliminarProveedor = async (id) => {
    if (confirm("¿Está seguro de que desea eliminar este proveedor?")) {
        try {
            await deleteDoc(doc(db, "usuarios", ID_LICENCIA, "proveedores", id));
            alert("Proveedor eliminado correctamente.");
        } catch (error) {
            alert("Error al eliminar: " + error.message);
        }
    }
};

window.limpiarFormulario = () => {
    const formProv = document.getElementById('form-proveedor');
    if(formProv) formProv.reset();
    document.getElementById('prov-id').value = '';
    document.getElementById('prov-codigo').readOnly = false;
    document.getElementById('btn-guardar-proveedor').innerHTML = `GUARDAR PROVEEDOR`;
    document.getElementById('btn-cancelar-edicion').style.display = 'none';
    document.getElementById('aviso-no-registrado').style.display = 'none';
    const list = document.getElementById('lista-resultados');
    if(list) list.style.display = 'none';
};

// --- LÓGICA PRINCIPAL ---
document.addEventListener('DOMContentLoaded', () => {
    const formProveedor = document.getElementById('form-proveedor');
    const inputCodigo = document.getElementById('prov-codigo');
    const listaResultados = document.getElementById('lista-resultados');
    const inputBuscar = document.getElementById('buscar-proveedor');
    const btnCancelar = document.getElementById('btn-cancelar-edicion');

    if (btnCancelar) {
        btnCancelar.addEventListener('click', window.limpiarFormulario);
    }

    // 1. Carga de datos en tiempo real
    onSnapshot(collection(db, "usuarios", ID_LICENCIA, "proveedores"), (snapshot) => {
        proveedoresMaster = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderizarTabla(proveedoresMaster);
    });

    function renderizarTabla(lista) {
        const tabla = document.getElementById('tabla-proveedores');
        if (!tabla) return;

        if (lista.length === 0) {
            tabla.innerHTML = `<tr><td colspan="5" style="text-align:center; color: #64748B;">No hay proveedores registrados.</td></tr>`;
            return;
        }

        tabla.innerHTML = lista.map(p => `
            <tr>
                <td><b>${p.codigo}</b></td>
                <td>${p.nombre}</td>
                <td>${p.rif || '-'}</td>
                <td>${p.telefono || '-'}</td>
                <td>
                    <button class="btn-table" onclick="window.prepararEdicion('${p.id}')" title="Editar"><i class="fas fa-edit"></i></button>
                    <button class="btn-table" style="color:#F43F5E;" onclick="window.eliminarProveedor('${p.id}')" title="Eliminar"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `).join('');
    }

    // 2. Buscador Dinámico en el campo Código
    if (inputCodigo) {
        inputCodigo.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase().trim();
            indiceRes = -1;
            
            if (term.length < 1) { 
                if(listaResultados) listaResultados.style.display = 'none'; 
                document.getElementById('aviso-no-registrado').style.display = 'none';
                return; 
            }
            
            const filtrados = proveedoresMaster.filter(p => 
                p.nombre?.toLowerCase().includes(term) || p.codigo?.toLowerCase().includes(term)
            );
            
            if (listaResultados && filtrados.length > 0) {
                document.getElementById('aviso-no-registrado').style.display = 'none';
                listaResultados.style.display = 'block';
                listaResultados.innerHTML = filtrados.map((p, i) => `
                    <div class="item-res" id="res-${i}" data-id="${p.id}" style="padding:10px; cursor:pointer; border-bottom:1px solid #eee;">
                        <b>${p.codigo}</b> - ${p.nombre}
                    </div>
                `).join('');

                document.querySelectorAll('.item-res').forEach(el => {
                    el.onclick = () => {
                        const prov = proveedoresMaster.find(x => x.id === el.dataset.id);
                        if(prov) window.cargarDatosProveedor(prov);
                    };
                });
            } else {
                if(listaResultados) listaResultados.style.display = 'none';
                document.getElementById('aviso-no-registrado').style.display = 'block';
            }
        });

        // Eventos de Navegación con Teclado
        inputCodigo.addEventListener('keydown', (e) => {
            if (!listaResultados || listaResultados.style.display === 'none') return;
            const items = listaResultados.querySelectorAll('.item-res');
            
            if (e.key === 'ArrowDown' && indiceRes < items.length - 1) {
                indiceRes++;
                items.forEach((it, i) => it.style.background = (i === indiceRes) ? '#F1F5F9' : 'white');
            } else if (e.key === 'ArrowUp' && indiceRes > 0) {
                indiceRes--;
                items.forEach((it, i) => it.style.background = (i === indiceRes) ? '#F1F5F9' : 'white');
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (indiceRes >= 0 && items[indiceRes]) {
                    items[indiceRes].click();
                } else {
                    const term = inputCodigo.value.trim().toUpperCase();
                    const prov = proveedoresMaster.find(p => p.codigo?.toUpperCase() === term);
                    if (prov) window.cargarDatosProveedor(prov);
                    else {
                        document.getElementById('aviso-no-registrado').style.display = 'block';
                        document.getElementById('prov-nombre').focus();
                    }
                }
            }
        });
    }

    // 3. Filtrar en la tabla principal
    if (inputBuscar) {
        inputBuscar.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase().trim();
            const filtrados = proveedoresMaster.filter(p => 
                p.nombre?.toLowerCase().includes(term) || 
                p.codigo?.toLowerCase().includes(term) ||
                p.rif?.toLowerCase().includes(term)
            );
            renderizarTabla(filtrados);
        });
    }

    // 4. Guardar / Actualizar en la colección usuarios/{ID_LICENCIA}/proveedores
    if (formProveedor) {
        formProveedor.addEventListener('submit', async (e) => {
            e.preventDefault();
            const codigo = inputCodigo.value.trim().toUpperCase();

            if (!codigo) {
                alert("Por favor ingrese un código válido.");
                return;
            }

            try {
                await setDoc(doc(db, "usuarios", ID_LICENCIA, "proveedores", codigo), {
                    codigo,
                    nombre: document.getElementById('prov-nombre').value.trim().toUpperCase(),
                    rif: document.getElementById('prov-rif').value.trim().toUpperCase(),
                    contacto: document.getElementById('prov-contacto').value.trim().toUpperCase(),
                    telefono: document.getElementById('prov-telefono').value.trim(),
                    direccion: document.getElementById('prov-direccion').value.trim().toUpperCase(),
                    updatedAt: serverTimestamp()
                }, { merge: true });

                alert("✅ Proveedor guardado exitosamente");
                window.limpiarFormulario();
            } catch (e) { 
                console.error("Error al guardar proveedor:", e);
                alert("Error al guardar: " + e.message); 
            }
        });
    }
});
