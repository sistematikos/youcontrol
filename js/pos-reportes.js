// Función para obtener ventas del día desde Firebase
window.obtenerVentasDia = async () => {
    const inicioHoy = new Date();
    inicioHoy.setHours(0, 0, 0, 0);

    const finHoy = new Date();
    finHoy.setHours(23, 59, 59, 999);

    // Consulta filtrada por fecha
    const q = query(
        collection(db, "ventas"), 
        where("fecha", ">=", inicioHoy.toISOString()),
        where("fecha", "<=", finHoy.toISOString())
    );

    const querySnapshot = await getDocs(q);
    let ventas = [];
    querySnapshot.forEach((doc) => {
        ventas.push(doc.data());
    });
    
    return ventas;
};