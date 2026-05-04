import { StyleSheet } from 'react-native';

// Markdown styles for react-native-markdown-display, tuned per theme
export function getMarkdownStyles(colors) {
  return StyleSheet.create({
    body: {
      color: colors.text,
      fontSize: 14,
      lineHeight: 22,
    },
    heading1: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 8,
      marginTop: 12,
    },
    heading2: {
      fontSize: 17,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 6,
      marginTop: 10,
    },
    heading3: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 4,
      marginTop: 8,
    },
    paragraph: {
      marginTop: 0,
      marginBottom: 8,
      color: colors.text,
    },
    code_inline: {
      backgroundColor: colors.surfaceAlt,
      color: colors.accent,
      borderRadius: 4,
      paddingHorizontal: 4,
      fontFamily: 'monospace',
      fontSize: 13,
    },
    fence: {
      backgroundColor: colors.surfaceAlt,
      borderRadius: 8,
      padding: 12,
      marginVertical: 8,
    },
    code_block: {
      backgroundColor: colors.surfaceAlt,
      borderRadius: 8,
      padding: 12,
      fontFamily: 'monospace',
      fontSize: 13,
    },
    bullet_list: {
      marginBottom: 8,
    },
    ordered_list: {
      marginBottom: 8,
    },
    list_item: {
      flexDirection: 'row',
      marginBottom: 4,
    },
    bullet_list_icon: {
      color: colors.accent,
      marginRight: 6,
    },
    strong: {
      fontWeight: '700',
    },
    em: {
      fontStyle: 'italic',
    },
    blockquote: {
      borderLeftWidth: 3,
      borderLeftColor: colors.accent,
      paddingLeft: 12,
      marginLeft: 0,
      marginVertical: 8,
      opacity: 0.8,
    },
    hr: {
      backgroundColor: colors.border,
      height: 1,
      marginVertical: 12,
    },
    link: {
      color: colors.accent,
    },
    del: {
      textDecorationLine: 'line-through',
      color: colors.textSecondary,
    },
  });
}

// Empty note template for a new day
export function newNoteContent() {
  return `# Notes — ${formatNoteDate()}\n\n`;
}

// Today's date formatted for note headings: "April 21, 2026"
export function formatNoteDate(date = new Date()) {
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

// Today's date as YYYY-MM-DD for file paths
export function todayPath() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Current time as HH:MM for note entry headers
export function currentTimeLabel() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
