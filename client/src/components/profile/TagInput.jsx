import { useEffect, useState } from 'react'
import { Typeahead } from 'react-bootstrap-typeahead'
import 'react-bootstrap-typeahead/css/Typeahead.css'
import { useTranslation } from 'react-i18next'
import { searchTags } from '../../api/tags.js'

const TagInput = ({ value, onChange, disabled }) => {
    const { t } = useTranslation()
    const [options, setOptions] = useState([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        searchTags('').then((tags) => setOptions(tags.map((tag) => tag.name))).catch(() => setOptions([]))
    }, [])

    const handleSearch = (query) => {
        setLoading(true)
        searchTags(query)
            .then((tags) => setOptions(tags.map((tag) => tag.name)))
            .catch(() => setOptions([]))
            .finally(() => setLoading(false))
    }

    return (
        <Typeahead
            id="project-tags"
            multiple
            allowNew
            disabled={disabled}
            isLoading={loading}
            options={options}
            selected={value}
            onSearch={handleSearch}
            onChange={(selected) => onChange(selected.map((s) => (typeof s === 'string' ? s : s.label)))}
            placeholder={t('profile.projects.tagsPlaceholder')}
        />
    )
}

export default TagInput
