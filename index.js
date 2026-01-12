const { Client } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');

const client = new Client();
const FILE = 'gastos.json';

let gastos = fs.existsSync(FILE)
  ? JSON.parse(fs.readFileSync(FILE))
  : [];

function guardar() {
  fs.writeFileSync(FILE, JSON.stringify(gastos, null, 2));
}

function detectarCategoria(texto) {
  texto = texto.toLowerCase();

  // Forzado manual
  if (texto.includes('/comida')) return 'comida';
  if (texto.includes('/transporte')) return 'transporte';
  if (texto.includes('/salidas')) return 'salidas';

  // Automático
  if (texto.match(/papas|bebida|pizza|sushi|comida|burger|khaki|completo|agua|ramen|coreana/))
    return 'comida';

  if (texto.match(/uber|taxi|transporte/))
    return 'transporte';

  if (texto.match(/cine|entrada|salida|panorama|concierto|bar/))
    return 'salidas';

  return 'otros';
}

function limpiarDetalle(texto) {
  return texto
    .replace('/comida', '')
    .replace('/transporte', '')
    .replace('/salidas', '')
    .trim();
}

client.on('qr', qr => {
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log('🤖 Bot listo');
});

client.on('message_create', msg => {
  const isGroup = msg.from.endsWith('@g.us')
  if (isGroup && !msg.body.startsWith('/')){
	return;
  }

  // /gasto 5000 papas y bebida
  if (msg.body.startsWith('/gasto')) {
    const partes = msg.body.split(' ');
    const monto = parseInt(partes[1]);
    const texto = partes.slice(2).join(' ');

    if (isNaN(monto) || !texto) {
      msg.reply('❌ Usa: /gasto 5000 papas y bebida');
      return;
    }

    const categoria = detectarCategoria(texto);
    const detalle = limpiarDetalle(texto);

    gastos.push({
      monto,
      categoria,
      detalle,
      fecha: new Date().toISOString()
    });

    guardar();

    msg.reply(`✅ Gasto agregado
💰 $${monto}
🏷️ ${categoria}
📝 ${detalle}`);
  }

  // /resumen o /resumen enero
  if (msg.body.startsWith('/resumen')) {
    const meses = [
      'enero','febrero','marzo','abril','mayo','junio',
      'julio','agosto','septiembre','octubre','noviembre','diciembre'
    ];

    const partes = msg.body.split(' ');
    let mes = new Date().getMonth();
    let año = new Date().getFullYear();

    if (partes[1]) {
      const index = meses.indexOf(partes[1].toLowerCase());
      if (index !== -1) mes = index;
    }

    const gastosMes = gastos.filter(g => {
      const f = new Date(g.fecha);
      return f.getMonth() === mes && f.getFullYear() === año;
    });

    if (gastosMes.length === 0) {
      msg.reply('📭 No hay gastos registrados ese mes');
      return;
    }

    let total = 0;
    let categorias = {};

    gastosMes.forEach(g => {
      total += g.monto;
      categorias[g.categoria] = (categorias[g.categoria] || 0) + g.monto;
    });

    let respuesta = `📊 Resumen ${meses[mes]} ${año}\n\n💰 Total: $${total}\n\n`;

    for (let cat in categorias) {
      const pct = ((categorias[cat] / total) * 100).toFixed(1);
      respuesta += `• ${cat}: $${categorias[cat]} (${pct}%)\n`;
    }

    msg.reply(respuesta);
  }
});

client.initialize();