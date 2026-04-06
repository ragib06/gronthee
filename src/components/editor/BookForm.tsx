import { useState } from 'react'
import { AlertCircle, Save } from 'lucide-react'
import type { BookMetadata, CollectionCode, ItemTypeCode } from '@/types'
import { COLLECTION_LABELS, ITEM_TYPE_LABELS } from '@/constants/mappings'
import FormField from './FormField'
import ScanDateField from './ScanDateField'

interface BookFormProps {
  initialValues: Partial<BookMetadata>
  scanDate: string
  onSave: (data: Omit<BookMetadata, 'id'>) => void
  onCancel: () => void
}

type FormState = {
  title: string
  subTitle: string
  otherTitle: string
  author: string
  secondAuthor: string
  editor: string
  translator: string
  illustrator: string
  publisher: string
  publishedYear: string
  publishedYearBengali: string
  isbn: string
  category: string
  genre: string
  collection: CollectionCode | ''
  itemType: ItemTypeCode | ''
  pageCount: string
  language: string
  edition: string
  publicationPlace: string
  summary: string
}

function initForm(initial: Partial<BookMetadata>): FormState {
  return {
    title: initial.title ?? '',
    subTitle: initial.subTitle ?? '',
    otherTitle: initial.otherTitle ?? '',
    author: initial.author ?? '',
    secondAuthor: initial.secondAuthor ?? '',
    editor: initial.editor ?? '',
    translator: initial.translator ?? '',
    illustrator: initial.illustrator ?? '',
    publisher: initial.publisher ?? '',
    publishedYear: initial.publishedYear ?? '',
    publishedYearBengali: initial.publishedYearBengali ?? '',
    isbn: initial.isbn ?? '',
    category: initial.category ?? '',
    genre: initial.genre ?? '',
    collection: initial.collection ?? '',
    itemType: initial.itemType ?? '',
    pageCount: initial.pageCount ?? '',
    language: initial.language ?? '',
    edition: initial.edition ?? '',
    publicationPlace: initial.publicationPlace ?? '',
    summary: initial.summary ?? '',
  }
}

const collectionOptions = [
  { value: '', label: 'Select collection' },
  ...Object.entries(COLLECTION_LABELS).map(([code, label]) => ({ value: code, label })),
]

const itemTypeOptions = [
  { value: '', label: 'Select item type' },
  ...Object.entries(ITEM_TYPE_LABELS).map(([code, label]) => ({ value: code, label })),
]

const sectionHeading = 'text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3 mt-6 first:mt-0'

type Errors = Partial<Record<keyof FormState, string>>

const REQUIRED_FIELDS: (keyof FormState)[] = [
  'title', 'author', 'publisher', 'publishedYear', 'isbn',
  'category', 'genre', 'collection', 'itemType', 'pageCount', 'language',
  'edition', 'publicationPlace', 'summary',
]

function validate(form: FormState): Errors {
  const errors: Errors = {}
  for (const field of REQUIRED_FIELDS) {
    if (!form[field].trim()) {
      errors[field] = 'This field is required'
    }
  }
  return errors
}

export default function BookForm({ initialValues, scanDate, onSave, onCancel }: BookFormProps) {
  const [form, setForm] = useState<FormState>(() => initForm(initialValues))
  const [errors, setErrors] = useState<Errors>({})
  const [submitAttempted, setSubmitAttempted] = useState(false)

  function set(field: keyof FormState) {
    return (val: string) => {
      setForm(prev => ({ ...prev, [field]: val }))
      if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  function handleSave() {
    const errs = validate(form)
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      setSubmitAttempted(true)
      return
    }
    setSubmitAttempted(false)
    const data: Omit<BookMetadata, 'id'> = {
      title: form.title.trim(),
      subTitle: form.subTitle.trim(),
      otherTitle: form.otherTitle.trim(),
      author: form.author.trim(),
      secondAuthor: form.secondAuthor.trim(),
      editor: form.editor.trim(),
      translator: form.translator.trim(),
      illustrator: form.illustrator.trim(),
      publisher: form.publisher.trim(),
      publishedYear: form.publishedYear.trim(),
      publishedYearBengali: form.publishedYearBengali.trim(),
      isbn: form.isbn.trim().replace(/-/g, ''),
      category: form.category.trim(),
      genre: form.genre.trim(),
      collection: form.collection as CollectionCode | '',
      itemType: form.itemType as ItemTypeCode | '',
      pageCount: form.pageCount.trim(),
      language: form.language.trim(),
      edition: form.edition.trim(),
      publicationPlace: form.publicationPlace.trim(),
      scanDate,
      summary: form.summary.trim(),
    }
    onSave(data)
  }

  return (
    <div>
      {/* Title Information */}
      <h3 className={sectionHeading}>Title Information</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <FormField id="title" label="Title" value={form.title} onChange={set('title')} placeholder="Book title" required error={errors.title} />
        </div>
        <FormField id="subTitle" label="Subtitle" value={form.subTitle} onChange={set('subTitle')} placeholder="Subtitle" />
        <FormField id="otherTitle" label="Other Title" value={form.otherTitle} onChange={set('otherTitle')} placeholder="Alternative title" />
      </div>

      {/* People */}
      <h3 className={sectionHeading}>People</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField id="author" label="Author" value={form.author} onChange={set('author')} placeholder="Primary author" required error={errors.author} />
        <FormField id="secondAuthor" label="Second Author" value={form.secondAuthor} onChange={set('secondAuthor')} placeholder="Second author" />
        <FormField id="editor" label="Editor" value={form.editor} onChange={set('editor')} placeholder="Editor" />
        <FormField id="translator" label="Translator" value={form.translator} onChange={set('translator')} placeholder="Translator" />
        <FormField id="illustrator" label="Illustrator" value={form.illustrator} onChange={set('illustrator')} placeholder="Illustrator" />
      </div>

      {/* Publication Details */}
      <h3 className={sectionHeading}>Publication Details</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <FormField id="publisher" label="Publisher" value={form.publisher} onChange={set('publisher')} placeholder="Publisher name" required error={errors.publisher} />
        <div>
          <FormField id="publishedYear" label="Year" value={form.publishedYear} onChange={set('publishedYear')} placeholder="YYYY" required error={errors.publishedYear} />
          {form.publishedYearBengali && (
            <p className="mt-1 text-xs text-indigo-500">
              Bengali calendar: {form.publishedYearBengali} BS
            </p>
          )}
        </div>
        <FormField id="publicationPlace" label="Publication Place" value={form.publicationPlace} onChange={set('publicationPlace')} placeholder="City, Country" required error={errors.publicationPlace} />
        <FormField id="edition" label="Edition" value={form.edition} onChange={set('edition')} placeholder="e.g. 2nd" required error={errors.edition} />
        <FormField id="isbn" label="ISBN" value={form.isbn} onChange={set('isbn')} placeholder="ISBN" required error={errors.isbn} />
        <FormField id="pageCount" label="Pages" value={form.pageCount} onChange={set('pageCount')} placeholder="Number of pages" required error={errors.pageCount} />
        <FormField id="language" label="Language" value={form.language} onChange={set('language')} placeholder="ISO 639-1 code" required error={errors.language} />
      </div>

      {/* Classification */}
      <h3 className={sectionHeading}>Classification</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField id="category" label="Category" value={form.category} onChange={set('category')} placeholder="Fiction or Non Fiction" required error={errors.category} />
        <FormField id="genre" label="Genre" value={form.genre} onChange={set('genre')} placeholder="Genre" required error={errors.genre} />
        <FormField
          id="collection"
          label="Collection"
          value={form.collection}
          onChange={set('collection')}
          type="select"
          options={collectionOptions}
          required
          error={errors.collection}
        />
        <FormField
          id="itemType"
          label="Item Type"
          value={form.itemType}
          onChange={set('itemType')}
          type="select"
          options={itemTypeOptions}
          required
          error={errors.itemType}
        />
      </div>

      {/* Other */}
      <h3 className={sectionHeading}>Other</h3>
      <div className="space-y-4">
        <ScanDateField date={scanDate} />
        <FormField id="summary" label="Summary" value={form.summary} onChange={set('summary')} type="textarea" placeholder="Brief summary of the book" required error={errors.summary} />
      </div>

      {/* Validation error summary */}
      {submitAttempted && Object.keys(errors).length > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mt-6">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>Some required fields are missing. Please fill in all highlighted fields above before saving.</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3 mt-4">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-5 py-2 text-sm rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-colors"
        >
          <Save size={15} />
          Save Book
        </button>
      </div>
    </div>
  )
}
