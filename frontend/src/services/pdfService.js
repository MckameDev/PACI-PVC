import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ============================================================
// PACI PDF Generator — Formatos: Compacto (A), Completo (B), Modular (C)
// Estructura basada en formato oficial PACI (Decreto 83/2015)
// Soporta Carta (Letter) y Legal
// ============================================================

const MARGIN = 20;

const PAGE_SIZES = {
  carta: { width: 216, height: 279 },
  legal: { width: 216, height: 356 },
};

const COLORS = {
  primary: [30, 58, 95],
  accent: [59, 130, 246],
  warning: [245, 158, 11],
  success: [34, 197, 94],
  text: [15, 23, 42],
  secondary: [100, 116, 139],
  light: [241, 245, 249],
};

/* ─────────────────────────────────────────────
   HEADER — Encabezado institucional
   ───────────────────────────────────────────── */
function addHeader(doc, paci, pageW, contentW) {
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageW, 32, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('PACI – Plan de Adecuación Curricular Individual', pageW / 2, 14, { align: 'center' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const estNombre = paci.establecimiento_nombre || '—';
  const estUbicacion = [paci.establecimiento_comuna, paci.establecimiento_region].filter(Boolean).join(', ');
  doc.text(estNombre + (estUbicacion ? '  —  ' + estUbicacion : ''), pageW / 2, 24, { align: 'center' });

  return 38;
}

/* ─────────────────────────────────────────────
   Section title with Roman numeral
   ───────────────────────────────────────────── */
function addSection(doc, y, title, pageH, contentW) {
  if (y > pageH - 32) { doc.addPage(); y = MARGIN; }

  doc.setFillColor(...COLORS.primary);
  doc.rect(MARGIN, y, contentW, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(title, MARGIN + 4, y + 6);

  return y + 12;
}

/* ─────────────────────────────────────────────
   I. IDENTIFICACIÓN
   ───────────────────────────────────────────── */
function addIdentificacion(doc, y, paci, pageH, contentW) {
  y = addSection(doc, y, 'I. IDENTIFICACIÓN', pageH, contentW);

  const col1 = MARGIN + 3;
  const col2 = MARGIN + contentW / 2;
  const LABEL_W = 38;
  const valMaxW = contentW / 2 - LABEL_W - 5;
  const LINE_H = 3.5;
  const ROW_GAP = 3;
  const PAD_Y = 3;

  doc.setFontSize(8);

  const rows = [
    ['Estudiante:', paci.estudiante_nombre, 'RUN:', paci.estudiante_rut],
    ['Curso Oficial:', paci.estudiante_curso, 'Tipo NEE:', paci.estudiante_tipo_nee],
    ['Diagnóstico:', paci.estudiante_diagnostico, 'Comorbilidad:', paci.estudiante_comorbilidad || 'N/A'],
    ['Nivel/Subtipo:', paci.estudiante_nivel_subtipo || 'N/A', 'Fecha Emisión:', paci.fecha_emision],
    ['Profesional PIE:', (paci.usuario_nombre || '—') + (paci.usuario_rol ? ` (${paci.usuario_rol})` : ''), 'Formato:', paci.formato_generado],
    ['Establecimiento:', paci.establecimiento_nombre, 'PAEC:', paci.aplica_paec ? 'Sí' : 'No'],
  ];

  // Pre-calculate wrapped lines and row heights
  const processed = rows.map(([l1, v1, l2, v2]) => {
    const lines1 = doc.splitTextToSize(String(v1 || '—'), valMaxW);
    const lines2 = doc.splitTextToSize(String(v2 || '—'), valMaxW);
    const maxLines = Math.max(lines1.length, lines2.length);
    return { l1, lines1, l2, lines2, h: maxLines * LINE_H + ROW_GAP };
  });

  const totalH = PAD_Y + processed.reduce((s, r) => s + r.h, 0) + PAD_Y;

  doc.setFillColor(...COLORS.light);
  doc.rect(MARGIN, y, contentW, totalH, 'F');
  doc.setDrawColor(200, 200, 200);
  doc.rect(MARGIN, y, contentW, totalH, 'S');

  doc.setTextColor(...COLORS.text);
  let curY = y + PAD_Y + LINE_H;

  for (const row of processed) {
    doc.setFont('helvetica', 'bold');
    doc.text(row.l1, col1, curY);
    doc.text(row.l2, col2, curY);
    doc.setFont('helvetica', 'normal');
    row.lines1.forEach((ln, i) => doc.text(ln, col1 + LABEL_W, curY + i * LINE_H));
    row.lines2.forEach((ln, i) => doc.text(ln, col2 + LABEL_W, curY + i * LINE_H));
    curY += row.h;
  }

  return y + totalH + 6;
}

/* ─────────────────────────────────────────────
   Perfil DUA section
   ───────────────────────────────────────────── */
function addDuaSection(doc, y, dua, sectionTitle, pageH, contentW) {
  y = addSection(doc, y, sectionTitle, pageH, contentW);

  const items = [
    ['Fortalezas', dua?.fortalezas],
    ['Barreras', dua?.barreras],
    ['Preferencias de Representación', dua?.preferencias_representacion],
    ['Preferencias de Expresión', dua?.preferencias_expresion],
    ['Preferencias de Motivación', dua?.preferencias_motivacion],
  ];

  doc.setFontSize(8);
  for (const [label, value] of items) {
    if (y > pageH - 20) { doc.addPage(); y = MARGIN; }
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.text);
    doc.text(label + ':', MARGIN + 2, y);
    y += 4;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.secondary);
    if (value) {
      for (const item of value.split('|').filter(Boolean)) {
        if (y > pageH - 17) { doc.addPage(); y = MARGIN; }
        doc.text('• ' + item, MARGIN + 6, y);
        y += 4;
      }
    } else {
      doc.text('No registrado', MARGIN + 6, y);
      y += 4;
    }
    y += 2;
  }

  return y;
}

/* ─────────────────────────────────────────────
   II. TRAYECTORIA CURRICULAR
   ───────────────────────────────────────────── */
function addTrayectoria(doc, y, trayectoria, pageH, contentW) {
  y = addSection(doc, y, 'II. TRAYECTORIA CURRICULAR', pageH, contentW);

  if (!trayectoria || trayectoria.length === 0) {
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.secondary);
    doc.text('Sin OAs registrados.', MARGIN + 2, y + 4);
    return y + 10;
  }

  const tableData = trayectoria.map((item, i) => [
    `${i + 1}`,
    item.oa_codigo || item.id_oa || '—',
    (item.texto_oa || '').substring(0, 55) + (item.texto_oa?.length > 55 ? '…' : ''),
    item.nivel_nombre || '—',
    String(item.diferencia_calculada ?? '—'),
    item.tipo_adecuacion || '—',
  ]);

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    head: [['#', 'OA Curso', 'OA Trabajado', 'Nivel', 'DIF', 'Tipo Adecuación']],
    body: tableData,
    styles: { fontSize: 7, cellPadding: 2, textColor: COLORS.text, lineColor: [200, 200, 200], lineWidth: 0.2 },
    headStyles: { fillColor: COLORS.primary, textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 22 },
      2: { cellWidth: contentW - 108 },
      3: { cellWidth: 25 },
      4: { cellWidth: 12, halign: 'center' },
      5: { cellWidth: 30 },
    },
    didParseCell: (data) => {
      if (data.column.index === 5 && data.section === 'body') {
        if (data.cell.raw === 'Significativa') {
          data.cell.styles.textColor = COLORS.warning;
          data.cell.styles.fontStyle = 'bold';
        } else {
          data.cell.styles.textColor = COLORS.success;
        }
      }
    },
  });

  return doc.lastAutoTable.finalY + 6;
}

/* ─────────────────────────────────────────────
   III. ADECUACIONES (detalle por OA)
   ───────────────────────────────────────────── */
function addAdecuaciones(doc, y, trayectoria, pageH, contentW) {
  y = addSection(doc, y, 'III. ADECUACIONES', pageH, contentW);

  if (!trayectoria || trayectoria.length === 0) return y;

  doc.setFontSize(7);
  doc.setTextColor(...COLORS.secondary);
  doc.setFont('helvetica', 'italic');
  doc.text('Acceso | Descenso | Priorización | Graduación | (NEEP: Eliminación / Enriquecimiento)', MARGIN + 2, y);
  y += 6;

  for (let i = 0; i < trayectoria.length; i++) {
    const item = trayectoria[i];
    if (y > pageH - 48) { doc.addPage(); y = MARGIN; }

    const bgColor = item.tipo_adecuacion === 'Significativa' ? [255, 247, 230] : [240, 248, 252];
    doc.setFillColor(...bgColor);
    doc.rect(MARGIN, y, contentW, 7, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.text);
    doc.text(`OA #${i + 1}: ${item.oa_codigo || '—'} — DIF: ${item.diferencia_calculada} (${item.tipo_adecuacion})`, MARGIN + 3, y + 5);
    y += 10;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.secondary);

    if (item.texto_oa) {
      const lines = doc.splitTextToSize(item.texto_oa, contentW - 10);
      doc.text(lines, MARGIN + 3, y);
      y += lines.length * 3.5 + 3;
    }

    const fields = item.tipo_adecuacion === 'Significativa'
      ? [
          ['Justificación Técnica', item.justificacion_tecnica],
          ['Modalidad Evaluación', item.eval_modalidad],
          ['Instrumento', item.eval_instrumento],
          ['Criterio de Logro', item.eval_criterio],
        ]
      : [
          ['Modalidad Evaluación', item.eval_modalidad],
          ['Instrumento', item.eval_instrumento],
          ['Criterio de Logro', item.eval_criterio],
        ];

    for (const [label, val] of fields) {
      if (!val) continue;
      if (y > pageH - 20) { doc.addPage(); y = MARGIN; }
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLORS.text);
      doc.text(label + ':', MARGIN + 3, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.secondary);
      const valLines = doc.splitTextToSize(val, contentW - 45);
      doc.text(valLines, MARGIN + 42, y);
      y += valLines.length * 3.5 + 2;
    }

    y += 4;
  }

  return y;
}

/* ─────────────────────────────────────────────
   PAEC section
   ───────────────────────────────────────────── */
function addPaec(doc, y, paci, sectionTitle, pageH, contentW) {
  if (!paci.aplica_paec) return y;

  y = addSection(doc, y, sectionTitle, pageH, contentW);

  doc.setFontSize(8);
  const fields = [
    ['Activadores / Gatillantes', paci.paec_activadores],
    ['Estrategias de Regulación', paci.paec_estrategias],
    ['Protocolo de Desregulación', paci.paec_desregulacion],
  ];

  for (const [label, val] of fields) {
    if (y > pageH - 20) { doc.addPage(); y = MARGIN; }
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.text);
    doc.text(label + ':', MARGIN + 2, y);
    y += 4;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.secondary);
    if (val) {
      const lines = doc.splitTextToSize(val, contentW - 10);
      doc.text(lines, MARGIN + 4, y);
      y += lines.length * 3.5 + 3;
    } else {
      doc.text('No registrado', MARGIN + 4, y);
      y += 6;
    }
  }

  return y;
}

/* ─────────────────────────────────────────────
   IV. SEGUIMIENTO — Tabla L / ED / NL
   ───────────────────────────────────────────── */
function addSeguimiento(doc, y, trayectoria, pageH, contentW) {
  y = addSection(doc, y, 'IV. SEGUIMIENTO', pageH, contentW);

  if (!trayectoria || trayectoria.length === 0) return y;

  doc.setFontSize(7);
  doc.setTextColor(...COLORS.secondary);
  doc.setFont('helvetica', 'italic');
  doc.text('Tabla de progreso con indicadores L (Logrado) / ED (En Desarrollo) / NL (No Logrado)', MARGIN + 2, y);
  y += 5;

  const tableData = trayectoria.map((item, i) => [
    `${i + 1}`,
    item.oa_codigo || item.id_oa || '—',
    item.nivel_nombre || '—',
    item.tipo_adecuacion || '—',
    '',
    '',
    '',
    '',
  ]);

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    head: [['#', 'Código OA', 'Nivel', 'Tipo', 'L', 'ED', 'NL', 'Observación']],
    body: tableData,
    styles: { fontSize: 7, cellPadding: 2, textColor: COLORS.text, lineColor: [200, 200, 200], lineWidth: 0.2 },
    headStyles: { fillColor: COLORS.primary, textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 22 },
      2: { cellWidth: 22 },
      3: { cellWidth: 25 },
      4: { cellWidth: 12, halign: 'center' },
      5: { cellWidth: 12, halign: 'center' },
      6: { cellWidth: 12, halign: 'center' },
      7: { cellWidth: contentW - 123 },
    },
  });

  const legendY = doc.lastAutoTable.finalY + 4;
  doc.setFontSize(7);
  doc.setTextColor(...COLORS.secondary);
  doc.setFont('helvetica', 'italic');
  doc.text('L = Logrado  |  ED = En Desarrollo  |  NL = No Logrado  —  Completar manualmente durante seguimiento.', MARGIN + 2, legendY);

  return legendY + 6;
}

/* ─────────────────────────────────────────────
   V. FIRMAS — 4 espacios de firma
   ───────────────────────────────────────────── */
function addFirmas(doc, y, pageH, contentW) {
  if (y > pageH - 65) { doc.addPage(); y = MARGIN; }
  y += 8;

  doc.setDrawColor(100, 100, 100);
  doc.setFontSize(7);

  const lineLen = 55;
  const gap = (contentW - lineLen * 2) / 3;
  const col1X = MARGIN + gap;
  const col2X = MARGIN + gap * 2 + lineLen;

  // Row 1: Docente + Profesor/a jefe
  doc.line(col1X, y, col1X + lineLen, y);
  doc.line(col2X, y, col2X + lineLen, y);
  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.text);
  doc.text('Docente de Asignatura', col1X + lineLen / 2, y, { align: 'center' });
  doc.text('Profesor/a Jefe', col2X + lineLen / 2, y, { align: 'center' });
  y += 3;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.secondary);
  doc.text('Nombre, Firma y Timbre', col1X + lineLen / 2, y, { align: 'center' });
  doc.text('Nombre, Firma y Timbre', col2X + lineLen / 2, y, { align: 'center' });

  // Row 2: Profesional PIE + Apoderado
  y += 15;
  doc.setDrawColor(100, 100, 100);
  doc.line(col1X, y, col1X + lineLen, y);
  doc.line(col2X, y, col2X + lineLen, y);
  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.text);
  doc.text('Profesional PIE / Especialista', col1X + lineLen / 2, y, { align: 'center' });
  doc.text('Apoderado/a', col2X + lineLen / 2, y, { align: 'center' });
  y += 3;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.secondary);
  doc.text('Nombre, Firma y Timbre', col1X + lineLen / 2, y, { align: 'center' });
  doc.text('Nombre y Firma', col2X + lineLen / 2, y, { align: 'center' });

  return y + 10;
}

/* ─────────────────────────────────────────────
   VI. TRABAJO COLABORATIVO (Formato B y C)
   ───────────────────────────────────────────── */
function addTrabajoColaborativo(doc, y, pageH, contentW) {
  y = addSection(doc, y, 'VI. TRABAJO COLABORATIVO', pageH, contentW);

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    head: [['Instancia', 'Fecha', 'Participantes', 'Acuerdos']],
    body: [['', '', '', ''], ['', '', '', ''], ['', '', '', '']],
    styles: { fontSize: 7, cellPadding: 4, textColor: COLORS.text, lineColor: [200, 200, 200], lineWidth: 0.2, minCellHeight: 10 },
    headStyles: { fillColor: COLORS.primary, textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 25 },
      2: { cellWidth: 40 },
      3: { cellWidth: contentW - 110 },
    },
  });

  return doc.lastAutoTable.finalY + 6;
}

/* ─────────────────────────────────────────────
   VII. SEGUIMIENTO EXTENDIDO (Formato B y C)
   ───────────────────────────────────────────── */
function addSeguimientoExtendido(doc, y, trayectoria, pageH, contentW) {
  y = addSection(doc, y, 'VII. SEGUIMIENTO EXTENDIDO', pageH, contentW);

  doc.setFontSize(7);
  doc.setTextColor(...COLORS.secondary);
  doc.setFont('helvetica', 'italic');
  doc.text('Registro mensual por OA — Completar durante el período escolar.', MARGIN + 2, y);
  y += 5;

  const months = ['Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const rows = (trayectoria || []).map((item, i) => [
    item.oa_codigo || `OA${i + 1}`,
    ...months.map(() => ''),
  ]);

  if (rows.length === 0) {
    rows.push(['—', ...months.map(() => '')]);
  }

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    head: [['OA', ...months]],
    body: rows,
    styles: { fontSize: 6, cellPadding: 2, textColor: COLORS.text, lineColor: [200, 200, 200], lineWidth: 0.2, halign: 'center', minCellHeight: 8 },
    headStyles: { fillColor: COLORS.primary, textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: { 0: { cellWidth: 22, halign: 'left', fontStyle: 'bold' } },
  });

  return doc.lastAutoTable.finalY + 6;
}

/* ─────────────────────────────────────────────
   VIII. MARCO NORMATIVO (Formato B y C)
   ───────────────────────────────────────────── */
function addMarcoNormativo(doc, y, pageH, contentW) {
  y = addSection(doc, y, 'VIII. MARCO NORMATIVO', pageH, contentW);

  doc.setFontSize(7);
  doc.setTextColor(...COLORS.text);

  const normas = [
    '\u2022 Decreto 83/2015: Aprueba criterios y orientaciones de adecuaci\u00f3n curricular para estudiantes con NEE de educaci\u00f3n parvularia y educaci\u00f3n b\u00e1sica.',
    '\u2022 Decreto 67/2018: Aprueba normas m\u00ednimas nacionales sobre evaluaci\u00f3n, calificaci\u00f3n y promoci\u00f3n.',
    '\u2022 Decreto 170/2009: Fija normas para determinar los alumnos con NEE que ser\u00e1n beneficiarios de las subvenciones para educaci\u00f3n especial.',
  ];

  for (const norma of normas) {
    if (y > pageH - 15) { doc.addPage(); y = MARGIN; }
    const lines = doc.splitTextToSize(norma, contentW - 6);
    doc.text(lines, MARGIN + 2, y);
    y += lines.length * 3.5 + 2;
  }

  return y + 4;
}

/* ─────────────────────────────────────────────
   XII. HORARIO DE APOYO (Formato Completo)
   ───────────────────────────────────────────── */
function addHorarioApoyo(doc, y, horarioApoyo, pageH, contentW) {
  y = addSection(doc, y, 'XII. HORARIO DE APOYO', pageH, contentW);

  const defaultCols = [
    { key: 'hora', titulo: 'Hora', orden: 1 },
    { key: 'lunes', titulo: 'Lunes', orden: 2 },
    { key: 'martes', titulo: 'Martes', orden: 3 },
    { key: 'miercoles', titulo: 'Miércoles', orden: 4 },
    { key: 'jueves', titulo: 'Jueves', orden: 5 },
    { key: 'viernes', titulo: 'Viernes', orden: 6 },
  ];

  const columnas = (horarioApoyo?.columnas?.length ? horarioApoyo.columnas : defaultCols)
    .slice()
    .sort((a, b) => (a.orden || 0) - (b.orden || 0));

  const filas = (horarioApoyo?.filas || [])
    .slice()
    .sort((a, b) => (a.orden || 0) - (b.orden || 0));

  const head = [columnas.map((col) => col.titulo)];
  const body = filas.length > 0
    ? filas.map((fila) => columnas.map((col) => (col.key === 'hora' ? (fila.hora || '') : ((fila.celdas || {})[col.key] || ''))))
    : [columnas.map(() => '')];

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    head,
    body,
    styles: {
      fontSize: 6.5,
      cellPadding: 2.2,
      textColor: COLORS.text,
      lineColor: [200, 200, 200],
      lineWidth: 0.2,
      minCellHeight: 8,
      valign: 'middle',
    },
    headStyles: { fillColor: COLORS.primary, textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  return doc.lastAutoTable.finalY + 6;
}

/* ─────────────────────────────────────────────
   FOOTER — Pie de página
   ───────────────────────────────────────────── */
function addFooter(doc, pageW, pageH) {
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(200, 200, 200);
    doc.line(MARGIN, pageH - 18, pageW - MARGIN, pageH - 18);

    doc.setFontSize(6);
    doc.setTextColor(...COLORS.secondary);
    doc.setFont('helvetica', 'normal');
    doc.text(
      'Documento v\u00e1lido para respaldo PIE conforme Decreto 83/2015 y normativa vigente.',
      pageW / 2, pageH - 13, { align: 'center' }
    );
    doc.text(
      `P\u00e1gina ${i} de ${totalPages} \u2014 Generado por PACI PVC \u2014 ${new Date().toLocaleDateString('es-CL')}`,
      pageW / 2, pageH - 8, { align: 'center' }
    );
  }
}

/* ═════════════════════════════════════════════
   Formato A: Compacto (I–V)
   ═════════════════════════════════════════════ */
function generateCompacto(doc, paci, pageW, pageH, contentW) {
  let y = addHeader(doc, paci, pageW, contentW);
  y = addIdentificacion(doc, y, paci, pageH, contentW);
  y = addTrayectoria(doc, y, paci.trayectoria, pageH, contentW);
  y = addAdecuaciones(doc, y, paci.trayectoria, pageH, contentW);
  y = addSeguimiento(doc, y, paci.trayectoria, pageH, contentW);
  y = addDuaSection(doc, y, paci.perfil_dua, 'PERFIL DUA \u2014 DISE\u00d1O UNIVERSAL DE APRENDIZAJE', pageH, contentW);
  if (paci.aplica_paec) {
    y = addPaec(doc, y, paci, 'PAEC \u2014 PLAN DE ACOMPA\u00d1AMIENTO EMOCIONAL Y CONDUCTUAL', pageH, contentW);
  }
  y = addSection(doc, y, 'V. FIRMAS', pageH, contentW);
  y = addFirmas(doc, y, pageH, contentW);
  addFooter(doc, pageW, pageH);
}

/* ═════════════════════════════════════════════
   Formato B: Completo (I–VIII)
   ═════════════════════════════════════════════ */
function generateCompleto(doc, paci, pageW, pageH, contentW) {
  let y = addHeader(doc, paci, pageW, contentW);
  y = addIdentificacion(doc, y, paci, pageH, contentW);
  y = addTrayectoria(doc, y, paci.trayectoria, pageH, contentW);
  y = addAdecuaciones(doc, y, paci.trayectoria, pageH, contentW);
  y = addSeguimiento(doc, y, paci.trayectoria, pageH, contentW);
  y = addDuaSection(doc, y, paci.perfil_dua, 'PERFIL DUA \u2014 DISE\u00d1O UNIVERSAL DE APRENDIZAJE', pageH, contentW);
  if (paci.aplica_paec) {
    y = addPaec(doc, y, paci, 'PAEC \u2014 PLAN DE ACOMPA\u00d1AMIENTO EMOCIONAL Y CONDUCTUAL', pageH, contentW);
  }
  y = addSection(doc, y, 'V. FIRMAS', pageH, contentW);
  y = addFirmas(doc, y, pageH, contentW);
  y = addTrabajoColaborativo(doc, y, pageH, contentW);
  y = addSeguimientoExtendido(doc, y, paci.trayectoria, pageH, contentW);
  y = addMarcoNormativo(doc, y, pageH, contentW);
  y = addHorarioApoyo(doc, y, paci.horario_apoyo, pageH, contentW);
  addFooter(doc, pageW, pageH);
}

/* ═════════════════════════════════════════════
   Formato C: Modular (I–VIII + Anexos)
   ═════════════════════════════════════════════ */
function generateModular(doc, paci, pageW, pageH, contentW) {
  let y = addHeader(doc, paci, pageW, contentW);
  y = addIdentificacion(doc, y, paci, pageH, contentW);
  y = addTrayectoria(doc, y, paci.trayectoria, pageH, contentW);
  y = addAdecuaciones(doc, y, paci.trayectoria, pageH, contentW);
  y = addSeguimiento(doc, y, paci.trayectoria, pageH, contentW);
  y = addSection(doc, y, 'V. FIRMAS', pageH, contentW);
  y = addFirmas(doc, y, pageH, contentW);
  y = addTrabajoColaborativo(doc, y, pageH, contentW);
  y = addSeguimientoExtendido(doc, y, paci.trayectoria, pageH, contentW);
  y = addMarcoNormativo(doc, y, pageH, contentW);

  // ANEXO 1 — PERFIL DUA
  doc.addPage();
  y = MARGIN;
  doc.setFillColor(...COLORS.accent);
  doc.rect(0, 0, pageW, 20, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('ANEXO 1 \u2013 PERFIL DUA DETALLADO', pageW / 2, 14, { align: 'center' });
  y = 28;
  y = addDuaSection(doc, y, paci.perfil_dua, 'PERFIL DUA', pageH, contentW);

  // ANEXO 2 — PAEC (if applicable)
  if (paci.aplica_paec) {
    doc.addPage();
    y = MARGIN;
    doc.setFillColor(...COLORS.warning);
    doc.rect(0, 0, pageW, 20, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('ANEXO 2 \u2013 PAEC', pageW / 2, 14, { align: 'center' });
    y = 28;
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.secondary);
    doc.text('Activadores | Estrategias preventivas | Plan ante desregulaci\u00f3n', MARGIN + 2, y);
    y += 6;
    y = addPaec(doc, y, paci, 'PLAN PAEC DETALLADO', pageH, contentW);
  }

  // ANEXO — Historial de Modificaciones
  doc.addPage();
  y = MARGIN;
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageW, 20, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('ANEXO ' + (paci.aplica_paec ? '3' : '2') + ' \u2013 HISTORIAL DE MODIFICACIONES', pageW / 2, 14, { align: 'center' });
  y = 28;

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    head: [['Fecha', 'Responsable', 'Ajuste Realizado']],
    body: [['', '', ''], ['', '', ''], ['', '', ''], ['', '', ''], ['', '', '']],
    styles: { fontSize: 7, cellPadding: 4, textColor: COLORS.text, lineColor: [200, 200, 200], lineWidth: 0.2, minCellHeight: 10 },
    headStyles: { fillColor: COLORS.primary, textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 30 },
      1: { cellWidth: 40 },
      2: { cellWidth: contentW - 80 },
    },
  });

  addFooter(doc, pageW, pageH);
}

/* ═════════════════════════════════════════════
   Public API
   ═════════════════════════════════════════════ */
export function generatePaciPdf(paci, pageSize = 'carta') {
  const size = PAGE_SIZES[pageSize] || PAGE_SIZES.carta;
  const pageW = size.width;
  const pageH = size.height;
  const contentW = pageW - MARGIN * 2;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [pageW, pageH],
  });

  doc.setFont('helvetica');

  switch (paci.formato_generado) {
    case 'Completo':
      generateCompleto(doc, paci, pageW, pageH, contentW);
      break;
    case 'Modular':
      generateModular(doc, paci, pageW, pageH, contentW);
      break;
    default:
      generateCompacto(doc, paci, pageW, pageH, contentW);
  }

  const filename = `PACI_${(paci.estudiante_nombre || 'documento').replace(/\s+/g, '_')}_${paci.fecha_emision || 'sin_fecha'}.pdf`;
  doc.save(filename);
}
