// A fast drop-in for csv-reader 1.0.0: run(input) returns exactly what it
// returns for {text, header} — {columns, rows, errors} — but without reading
// one character at a time. Each field jumps to its next delimiter in one
// native scan: a regex finds the next comma, CR or LF for an unquoted field,
// and the next quote, CR or LF inside a quoted field. Only the rare broken
// bits (a stray CR, a doubled quote, a newline inside quotes) take a short
// segment loop, and the value is built from slices, never one character at
// a time.
//
// The semantics below follow the reference's broken-row policy:
//   - a U+FEFF at the very start is dropped;
//   - a record ends at LF or CRLF, a line with no characters is no record;
//   - outside quotes a CR not followed by LF is dropped (stray_cr);
//   - a field opening with a quote runs to the next non-doubled quote ("" one
//     quote, CRLF/lone CR inside read as LF); what follows its closing quote
//     up to the next comma or line break is appended as it stands
//     (quote_junk, when the field ends); a quote that never closes is a
//     literal character and the text after it is read again as unquoted
//     (unterminated_quote); a quote inside an unquoted field is literal;
//   - fields stay strings, never trimmed or converted;
//   - columns is the first record when header is true, else null; rows holds
//     the records after it, each padded (short_row, fields: its count) or cut
//     (long_row, extra: the cut fields) to the first record's width;
//   - each error is {code, line, row} in the order met, line the 1-based line
//     its record starts on, row its record's index in rows (null: header).

/** How a field ended: at a comma, at a line break, or at the end of the text. */
const COMMA = 0;
const LINE_BREAK = 1;
const END = 2;

/** The next delimiter of an unquoted field: a comma, a CR or an LF. */
const DELIM = /[,\r\n]/g;
/** The next stop inside a quoted field: a quote, a CR or an LF. */
const QSTOP = /["\r\n]/g;

/** csv-reader 1.0.0's answer for one case's input, read fast. */
export function run(input) {
  const text = String(input.text);
  const header = input.header === true;
  const len = text.length;
  const errors = [];
  const rows = [];
  let columns = null;
  let width = -1;
  let pos = 0;
  let line = 1;
  if (len > 0 && text.charCodeAt(0) === 0xfeff) pos = 1;

  // The record being read: the line it starts on and the index in rows it
  // takes (null: the header). Errors inside it carry these two.
  let recordLine = 1;
  let recordRow = null;

  // Reads unquoted characters onto `init` up to the next comma or line break.
  // A CR not followed by LF is dropped (stray_cr) and the field goes on.
  function readUnquoted(init) {
    let value = init;
    let p = pos;
    for (;;) {
      DELIM.lastIndex = p;
      const hit = DELIM.exec(text);
      if (hit === null) {
        value += text.slice(p);
        pos = len;
        return { value, ended: END };
      }
      const end = hit.index;
      const ch = hit[0];
      if (ch === ',') {
        value += text.slice(p, end);
        pos = end + 1;
        return { value, ended: COMMA };
      }
      if (ch === '\n') {
        value += text.slice(p, end);
        pos = end + 1;
        line += 1;
        return { value, ended: LINE_BREAK };
      }
      // A CR: a line break when an LF follows it, a stray CR otherwise.
      if (text.charCodeAt(end + 1) === 10) {
        value += text.slice(p, end);
        pos = end + 2;
        line += 1;
        return { value, ended: LINE_BREAK };
      }
      value += text.slice(p, end);
      errors.push({ code: 'stray_cr', line: recordLine, row: recordRow });
      p = end + 1;
    }
  }

  while (true) {
    // Lines with no characters are no records.
    while (pos < len) {
      const c = text.charCodeAt(pos);
      if (c === 10) { pos += 1; line += 1; }
      else if (c === 13 && text.charCodeAt(pos + 1) === 10) { pos += 2; line += 1; }
      else break;
    }
    if (pos >= len) break;

    recordLine = line;
    recordRow = header && columns === null ? null : rows.length;
    const fields = [];
    let ended = COMMA;
    let quoted = false;
    do {
      if (text.charCodeAt(pos) === 34) {
        quoted = true;
        const open = pos;
        const openLine = line;
        let value = '';
        let seg = pos + 1;
        let p = pos + 1;
        let closed = -1;
        for (;;) {
          QSTOP.lastIndex = p;
          const hit = QSTOP.exec(text);
          if (hit === null) break;
          const m = hit.index;
          const ch = hit[0];
          if (ch === '"') {
            if (text.charCodeAt(m + 1) === 34) {
              value += text.slice(seg, m);
              value += '"';
              p = m + 2;
              seg = p;
            } else {
              value += text.slice(seg, m);
              closed = m;
              break;
            }
          } else if (ch === '\n') {
            value += text.slice(seg, m);
            value += '\n';
            line += 1;
            p = m + 1;
            seg = p;
          } else {
            value += text.slice(seg, m);
            value += '\n';
            line += 1;
            p = m + 1;
            if (text.charCodeAt(p) === 10) p += 1;
            seg = p;
          }
        }
        if (closed < 0) {
          // The quote never closes: it is a literal character, and the text
          // after it is read again as unquoted.
          pos = open + 1;
          line = openLine;
          errors.push({ code: 'unterminated_quote', line: recordLine, row: recordRow });
          const r = readUnquoted('"');
          fields.push(r.value);
          ended = r.ended;
        } else {
          pos = closed + 1;
          if (pos >= len) {
            fields.push(value);
            ended = END;
          } else {
            const c = text.charCodeAt(pos);
            if (c === 44) {
              pos += 1;
              fields.push(value);
              ended = COMMA;
            } else if (c === 10) {
              pos += 1;
              line += 1;
              fields.push(value);
              ended = LINE_BREAK;
            } else if (c === 13 && text.charCodeAt(pos + 1) === 10) {
              pos += 2;
              line += 1;
              fields.push(value);
              ended = LINE_BREAK;
            } else {
              // What follows the closing quote is appended as it stands.
              const before = value.length;
              const r = readUnquoted(value);
              if (r.value.length > before) errors.push({ code: 'quote_junk', line: recordLine, row: recordRow });
              fields.push(r.value);
              ended = r.ended;
            }
          }
        }
      } else {
        quoted = false;
        const r = readUnquoted('');
        fields.push(r.value);
        ended = r.ended;
      }
    } while (ended === COMMA);

    // A line that held only stray CRs is left with no characters: no record
    // (its stray_cr errors stay).
    if (fields.length === 1 && fields[0] === '' && !quoted) continue;

    if (width < 0) width = fields.length;
    if (header && columns === null) {
      columns = fields;
      continue;
    }
    if (fields.length < width) {
      errors.push({ code: 'short_row', line: recordLine, row: recordRow, fields: fields.length });
      while (fields.length < width) fields.push('');
    } else if (fields.length > width) {
      errors.push({ code: 'long_row', line: recordLine, row: recordRow, extra: fields.splice(width) });
    }
    rows.push(fields);
  }
  return { columns: header ? (columns ?? []) : null, rows, errors };
}
