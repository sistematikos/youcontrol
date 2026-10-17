import { db } from './firebase-config.js';
import { 
    collection, 
    onSnapshot, 
    doc, 
    deleteDoc, 
    serverTimestamp, 
    setDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let proveedoresMaster = [];
let indiceRes = -1;

// --- FUNCIONES GLOBALES (Para el DOM) ---
window.cargarDatosProveedor = (p) => {
    document.getElementById('prov-id').value = p.id || '';
    document.getElementById('prov-codigo').value = p.codigo || '';
    document.getElementById('prov-codigo').readOnly = true;
    document.getElementById('prov-nombre').value = p.nombre || '';
    document.getElementById('prov-rif').value = p.rif || '';
    
    const inputContacto = document.getElementById('prov-contacto');
    if (inputContacto) inputContacto.value = p.contacto || '';

    document.getElementById('prov-telefono').value = p.telefono || '';
    document.getElementById('prov-direccion').value = p.direccion || '';
    
    const btnGuardar = document.getElementById('btn-guardar-proveedor');
    if (btnGuardar) btnGuardar.innerHTML = `<i class="fas fa-sync-alt"></i> ACTUALIZAR PROVEEDOR`;
    
    const btnCancelar = document.getElementById('btn-cancelar-edicion');
    if (btnCancelar) btnCancelar.style.display = 'block';

    const aviso = document.getElementById('aviso-no-registrado');
    if (aviso) aviso.style.display = 'none';

    document.getElementById('prov-nombre').focus();
    
    const list = document.getElementById('lista-resultados');
    if (list) list.style.display = 'none';
};

window.prepararEdicion = (id) => {
    const p = proveedoresMaster.find(x => x.id === id);
    if (p) window.cargarDatosProveedor(p);
};

window.eliminarProveedor = async (id) => {
    const ID_LICENCIA = localStorage.getItem('youcontrol_empresa_id');
    if (!ID_LICENCIA) {
        alert("Error: No se encontró la licencia activa.");
        return;
    }

    if (confirm("¿Eliminar este proveedor?")) {
        try {
            await deleteDoc(doc(db, "usuarios", ID_LICENCIA, "proveedores", id));
            alert("Proveedor eliminado con éxito");
        } catch (error) {
            alert("Error al eliminar: " + error.message);
        }
    }
};

window.limpiarFormulario = () => {
    const formProveedor = document.getElementById('form-proveedor');
    if (formProveedor) formProveedor.reset();

    const provId = document.getElementById('prov-id');
    if (provId) provId.value = '';

    const inputCodigo = document.getElementById('prov-codigo');
    if (inputCodigo) inputCodigo.readOnly = false;

    const btnGuardar = document.getElementById('btn-guardar-proveedor');
    if (btnGuardar) btnGuardar.innerHTML = `GUARDAR PROVEEDOR`;

    const btnCancelar = document.getElementById('btn-cancelar-edicion');
    if (btnCancelar) btnCancelar.style.display = 'none';

    const aviso = document.getElementById('aviso-no-registrado');
    if (aviso) aviso.style.display = 'none';

    const list = document.getElementById('lista-resultados');
    if (list) list.style.display = 'none';
};

// --- LÓGICA PRINCIPAL ---
document.addEventListener('DOMContentLoaded', () => {
    const ID_LICENCIA = localStorage.getItem('youcontrol_empresa_id');
    console.log("🔍 ID_LICENCIA detectado en proveedores:", ID_LICENCIA);

    const tabla = document.getElementById('tabla-proveedores');

    if (!ID_LICENCIA) {
        if (tabla) {
            tabla.innerHTML = `<tr><td colspan="5" style="text-align:center; color:red;">No se encontró la empresa activa en el navegador.</td></tr>`;
        }
        return;
    }

    const formProveedor = document.getElementById('form-proveedor');
    const inputCodigo = document.getElementById('prov-codigo');
    const listaResultados = document.getElementById('lista-resultados');
    const btnCancelar = document.getElementById('btn-cancelar-edicion');

    if (btnCancelar) {
        btnCancelar.addEventListener('click', window.limpiarFormulario);
    }

    // 1. Carga de datos en tiempo real
    onSnapshot(collection(db, "usuarios", ID_LICENCIA, "proveedores"), (snapshot) => {
        proveedoresMaster = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log("📦 Proveedores cargados:", proveedoresMaster.length);

        if (tabla) {
            if (proveedoresMaster.length === 0) {
                tabla.innerHTML = `<tr><td colspan="5" style="text-align:center;">No hay proveedores registrados.</td></tr>`;
            } else {
                tabla.innerHTML = proveedoresMaster.map(p => `
                    <tr>
                        <td>${p.codigo}</td>
                        <td><b>${p.nombre}</b></td>
                        <td>${p.rif || '-'}</td>
                        <td>${p.telefono || '-'}</td>
                        <td>
                            <button class="btn-table" onclick="window.prepararEdicion('${p.id}')"><i class="fas fa-edit"></i></button>
                            <button class="btn-table delete" onclick="window.eliminarProveedor('${p.id}')"><i class="fas fa-trash"></i></button>
                        </td>
                    </tr>
                `).join('');
            }
        }
    }, (error) => {
        console.error("❌ Error en onSnapshot de proveedores:", error);
    });

    // 2. Buscador Dinámico / Input de Código
    if (inputCodigo) {
        inputCodigo.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            indiceRes = -1;
            const avisoReg = document.getElementById('aviso-no-registrado');

            if (term.length < 2) { 
                if (listaResultados) listaResultados.style.display = 'none'; 
                if (avisoReg) avisoReg.style.display = 'none';
                return; 
            }
            
            const filtrados = proveedoresMaster.filter(p => p.nombre?.toLowerCase().includes(term) || p.codigo?.toLowerCase().includes(term));
            
            if (listaResultados && filtrados.length > 0) {
                if (avisoReg) avisoReg.style.display = 'none';
                listaResultados.style.display = 'block';
                listaResultados.innerHTML = filtrados.map((p, i) => `
                    <div class="item-res" id="res-${i}" data-id="${p.id}" style="padding:10px; cursor:pointer; border-bottom:1px solid #eee;">
                        ${p.nombre} (Cod: ${p.codigo})
                    </div>
                `).join('');

                document.querySelectorAll('.item-res').forEach(el => {
                    el.onclick = () => {
                        const proveedor = proveedoresMaster.find(x => x.id === el.dataset.id);
                        if (proveedor) window.cargarDatosProveedor(proveedor);
                    };
                });
            } else {
                if (listaResultados) listaResultados.style.display = 'none';
                if (avisoReg) avisoReg.style.display = 'block';
            }
        });

        // 3. Manejo de Teclado
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
                    const proveedor = proveedoresMaster.find(p => p.codigo?.toUpperCase() === term);
                    if (proveedor) window.cargarDatosProveedor(proveedor);
                    else {
                        const avisoReg = document.getElementById('aviso-no-registrado');
                        if (avisoReg) avisoReg.style.display = 'block';
                        document.getElementById('prov-nombre').focus();
                    }
                }
            }
        });
    }

    // 4. Guardar o Actualizar
    if (formProveedor) {
        formProveedor.addEventListener('submit', async (e) => {
            e.preventDefault();
            const codigo = inputCodigo.value.trim().toUpperCase();
            
            if (!codigo) {
                alert("⚠️ El código del proveedor es obligatorio.");
                return;
            }

            try {
                await setDoc(doc(db, "usuarios", ID_LICENCIA, "proveedores", codigo), {
                    codigo,
                    nombre: document.getElementById('prov-nombre').value.trim().toUpperCase(),
                    rif: document.getElementById('prov-rif').value.trim().toUpperCase(),
                    contacto: document.getElementById('prov-contacto')?.value.trim().toUpperCase() || '',
                    telefono: document.getElementById('prov-telefono').value.trim(),
                    direccion: document.getElementById('prov-direccion').value.trim().toUpperCase(),
                    updatedAt: serverTimestamp()
                }, { merge: true });
                
                alert("✅ ¡Proveedor guardado con éxito!");
                window.limpiarFormulario();
            } catch (error) { 
                console.error("Error al guardar proveedor:", error);
                alert("❌ Error al guardar en la base de datos: " + error.message); 
            }
        });
    }
});
