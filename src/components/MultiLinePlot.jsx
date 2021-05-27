import './MultiLinePlot.css'

import React, { useMemo } from 'react'
import { Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ComposedChart, Area, ReferenceArea } from 'recharts'
import format from 'date-fns/format'
import * as tailwindColors from 'tailwindcss/colors'
import classNames from 'classnames'
import { orderBy } from 'lodash'

import useQueryAsState from '../hooks/useQueryAsState'
import config from '../config'

const formatLargeNumber = number => {
  const fixed = number.toFixed(2)
  return parseFloat(fixed).toLocaleString(undefined, { minimumFractionDigits: 2 })
}

const CustomTooltip = ({ active, payload, label, percentage }) => {
  if (active && payload) {
    const _payload = payload.filter(_ => _.value > 0)
    _payload.sort((a, b) => {
      if (a.value < b.value) return 1
      if (a.value > b.value) return -1
      return 0
    })
    const { timeline } = config
    return (
      <div className='p-3 bg-white shadow-md rounded-md text-sm leading-5 ring-1 ring-black ring-opacity-5'>
        <h4 className='text-center text-gray-700 font-bold mb-1'>
          {format(new Date(label), timeline.date_format.chart_tooltip)}
        </h4>
        <table className='tabular-nums w-full'>
          <thead className='sr-only'>
            <tr>
              <th>Color</th>
              <th>Lineage</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
          {_payload.length === 0 && <tr><td colSpan={3} className='text-center text-gray-700'>No data</td></tr>}
          {_payload.map(item => {
            if (item.name === '_range') {
              return null
            }
            return (
              <tr key={item.name} className='tooltip_entry'>
                <td>
                  <i className='block rounded-full h-3 w-3' style={{ backgroundColor: item.stroke }} />
                </td>
                <td className='px-3'>
                  {item.name}
                </td>
                <td className='text-right'>
                  {percentage ? `${item.value.toFixed(1)}%` : formatLargeNumber(item.value)}
                </td>
              </tr>
            )
          })}
          </tbody>
        </table>
      </div>
    )
  }

  return null
}

const MultiLinePlot = props => {
  const animationDuration = 500

  const {
    parameter, preset = parameter === 'p' ? 'percentage' : null, // back compat
    yAxis: yAxisConfig = {}, /* xAxis: xAxisConfig = {}, */
    date, setDate, area_data, activeLineages,
    type, width, height = 120, stroke = 'blueGray', className
  } = props

  const [{ xMin, xMax }, updateQuery] = useQueryAsState()

  const chart = useMemo(() => {
    const dataByDate = {}
    const presentLineages = new Set()

    for (const d of area_data) {
      if (d.parameter === parameter && d.lineage !== 'total') {
        dataByDate[d.date] = {
          ...dataByDate[d.date],
          date: d.date,
          [d.lineage]: d.mean,
          [`${d.lineage}_range`]: d.range
        }
        presentLineages.add(d.lineage)
      }
    }

    const lineages = []
    for (const lineage of Array.from(presentLineages)) {
      const { active, colour } = activeLineages[lineage]
      if (active) {
        lineages.push({ lineage, colour })
      }
    }

    const data =
      orderBy(Object.values(dataByDate), 'date', 'asc')
        .map((d, index) => ({ ...d, index }))

    const dates = data.map(_ => _.date)

    return {
      lineages,
      data,
      dates
    }
  }, [area_data, activeLineages])

  const { lineages, data, dates } = chart

  const chartProps = useMemo(() => ({
    data,
    width,
    height,
    margin: { top: 12, left: 0, right: 24 }
  }), [data, width, height])

  const yAxisTicks = useMemo(() => {
    if (preset === 'percentage') {
      if (lineages.length === 0) {
        return { ticks: false }
      }
      const fullScale = lineages.length === Object.keys(activeLineages).length
      if (fullScale) {
        return {
          tickFormatter: value => `${Math.min(parseFloat(value), 100)}%`,
          ticks: [0, 25, 50, 75, 100]
        }
      }
      return {
        tickFormatter: value => {
          if (value === 0) return '0%'
          if (value >= 100) return '100%'
          if (!Number.isInteger(value)) return `${value.toFixed(1)}%`
          return `${value}%`
        }
      }
    }
    return {
      tickFormatter: value => {
        if (value >= 10e3) {
          return `${value.toString().slice(0, 2)}K`
        }
        return value.toLocaleString()
      },
      ticks: yAxisConfig.ticks
    }
  }, [preset, lineages, activeLineages, yAxisConfig])

  const yAxisDomain = useMemo(() => {
    if (preset === 'percentage' && type === 'area' && lineages.length) {
      return [0, 1]
    } else if (yAxisConfig.domain) {
      return yAxisConfig.domain
    } else {
      return [0, 'auto']
    }
  }, [preset, type, yAxisConfig.domain, lineages])

  const xAxisDomain = useMemo(() => {
    if (xMin && xMax) {
      const _xMin = Math.max(dates.indexOf(xMin), 0)
      const _xMax = Math.min(dates.indexOf(xMax), data.length - 1)
      return _xMin < _xMax ? [_xMin, _xMax] : [_xMax, _xMin]
    }
    return ['dataMin', 'dataMax']
  }, [xMax])

  const [zoomArea, setZoomArea] = React.useState({})

  const grid =
    <CartesianGrid stroke={tailwindColors[stroke][300]} />

  const tooltip = useMemo(() =>
    <Tooltip
      content={CustomTooltip}
      percentage={preset === 'percentage'}
      cursor={{ stroke: tailwindColors[stroke][400] }}
    />
  , [format, stroke])

  const xAxis = useMemo(() =>
    <XAxis
      dataKey='index'
      type="number"
      allowDataOverflow
      domain={xAxisDomain}
      fontSize='12'
      tick={data.length}
      tickFormatter={i => i in data ? format(new Date(data[i].date), 'd MMM') : ''}
      tickMargin='4'
      stroke='currentcolor'
    />
  , [data, xAxisDomain])

  const yAxis =
    <YAxis
      type='number'
      allowDataOverflow={yAxisConfig.allow_data_overflow || false}
      domain={yAxisDomain}
      fontSize='12'
      width={48}
      stroke='currentcolor'
      tickMargin='4'
      tick={data.length}
      {...yAxisTicks}
    />

  const areas = useMemo(() => {
    if (type === 'area') {
      return lineages.map(({ lineage, colour }) => (
        <Area
          key={lineage}
          activeDot={{ stroke: tailwindColors[stroke][400] }}
          dataKey={lineage}
          dot={false}
          fill={colour}
          name={lineage}
          stackId='1'
          stroke={colour}
          type='monotone'
          animationDuration={animationDuration}
          isAnimationActive={true}
        />
      ))
    }
    return lineages.map(({ lineage, colour }) => {
      const key = `${lineage}_range`
      return (
        <Area
          key={key}
          activeDot={false}
          dataKey={key}
          fill={colour}
          name='_range'
          strokeWidth={0}
          type='monotone'
          animationDuration={animationDuration}
          isAnimationActive={true}
        />
      )
    })
  }, [lineages, stroke, type])

  const lines = useMemo(() => {
    if (type === 'area') return null
    return lineages.map(({ lineage, colour }) =>
      <Line
        key={lineage}
        activeDot={{ stroke: tailwindColors[stroke][400] }}
        dataKey={lineage}
        dot={false}
        name={lineage}
        stroke={colour}
        type='monotone'
        animationDuration={animationDuration}
        isAnimationActive={true}
      />
    )
  }, [lineages, stroke, type])

  const xReference = useMemo(() => {
    if (yAxisConfig.reference_line === undefined) return null
    return (
      <ReferenceLine
        y={yAxisConfig.reference_line}
        stroke={tailwindColors[stroke][600]}
        strokeDasharray={[8, 8]}
        label=''
        strokeWidth={2}
        style={{ mixBlendMode: 'multiply' }}
      />
    )
  }, [yAxisConfig.reference_line, stroke])

  return (
    <div className={classNames('relative select-none', className)} onDoubleClick={() => updateQuery({ xMin: undefined, xMax: undefined })}>
      <ComposedChart
        {...chartProps}
        onClick={item => {
          if (item) {
            setDate(data[item.activeLabel].date)
          }
        }}
        onMouseDown={(e) => setZoomArea({ start: e.activeLabel, end: zoomArea.end })}
        onMouseMove={(e) => zoomArea.start && setZoomArea({ start: zoomArea.start, end: e.activeLabel })}
        onMouseUp={() => {
          const xMin = data[zoomArea.start].date
          const xMax = data[zoomArea.end].date
          updateQuery({ xMin, xMax }); setZoomArea({})
        }}
        cursor='pointer'
      >
        {grid}
        {areas}
        {xAxis}
        {yAxis}
        {tooltip}
        {xReference}
        {lines}
        {zoomArea.start && zoomArea.end
          ? <ReferenceArea x1={zoomArea.start} x2={zoomArea.end} strokeOpacity={0.3} />
          : null}
      </ComposedChart>
      <div className='absolute top-0 left-0 pointer-events-none'>
        <ComposedChart {...chartProps}>
          <XAxis
            dataKey='index'
            domain={xAxisDomain}
            tick={false}
            stroke='none'
          />
          <YAxis
            type='number'
            domain={yAxisDomain}
            width={48}
            tick={false}
            stroke='none'
          />
          <ReferenceLine
            x={dates.indexOf(date)}
            stroke={tailwindColors[stroke][400]}
            label=''
            strokeWidth={2}
            style={{ mixBlendMode: 'multiply' }}
          />
        </ComposedChart>
      </div>
    </div>
  )
}

export default MultiLinePlot
