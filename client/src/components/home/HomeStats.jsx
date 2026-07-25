import { Card, Col, Row } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { getHomeStats } from '../../api/home.js'
import { useAsyncData } from '../../hooks/useAsyncData.js'
import ErrorAlert from '../common/ErrorAlert.jsx'

const TILE_KEYS = ['resumesLast24h', 'totalPositions', 'totalCandidates', 'totalRecruiters', 'totalSubmittedResumes']

const HomeStats = () => {
    const { t } = useTranslation()
    const { data: stats, error } = useAsyncData(getHomeStats)

    if (error) return <ErrorAlert error={error} />

    return (
        <Row className="g-3 mb-4">
            {TILE_KEYS.map((key) => (
                <Col key={key} xs={6} md={4} lg={2}>
                    <Card className="text-center h-100">
                        <Card.Body>
                            <Card.Title as="div" className="fs-3">{stats ? stats[key] : '—'}</Card.Title>
                            <Card.Text className="text-muted small mb-0">{t(`home.stats.${key}`)}</Card.Text>
                        </Card.Body>
                    </Card>
                </Col>
            ))}
        </Row>
    )
}

export default HomeStats
