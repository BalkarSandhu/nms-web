import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export type CsvColumn<T> = {
  header: string
  accessor: keyof T | ((row: T, index: number) => string | number | boolean | null | undefined)
}

export function exportToCsv<T>(filename: string, rows: T[], columns: CsvColumn<T>[]) {
  if (typeof window === 'undefined' || !rows.length || !columns.length) {
    return
  }

  const escapeValue = (value: unknown) => {
    if (value === null || value === undefined) return ''
    const stringValue = String(value)
    const shouldQuote = /[",\n]/.test(stringValue)
    const sanitized = stringValue.replace(/"/g, '""')
    return shouldQuote ? `"${sanitized}"` : sanitized
  }

  const headerRow = columns.map((column) => escapeValue(column.header)).join(',')
  const dataRows = rows.map((row, index) =>
    columns
      .map((column) => {
        if (typeof column.accessor === 'function') {
          return escapeValue(column.accessor(row, index))
        }
        return escapeValue(row[column.accessor])
      })
      .join(',')
  )

  const csvContent = [headerRow, ...dataRows].join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
