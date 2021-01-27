import React, { useState, useEffect } from "react";
import Spinner from "./Spinner";
import Chloropleth from "./Chloropleth";
import LocalIncidence from "./LocalIncidence";
import { FaPlay, FaPause } from 'react-icons/fa';
import Slider from "rc-slider";


import "rc-slider/assets/index.css";

import { loadTiles, getLALookupTable } from "../utils/loadTiles";
import { loadData } from "../utils/loadData";
import { min } from "moment";
import memoize from 'memoize-one';
let LALookupTable = getLALookupTable()

function get_min_min_max(dataframe, parameter, value_of_interest, lineage) {

  let dataframe_selected_parameter = dataframe.where(x => x.parameter == parameter)
  dataframe_selected_parameter = dataframe_selected_parameter.where(x => x.lineage === lineage)
  const series = dataframe_selected_parameter.where(x => x['mean'] != undefined).getSeries(value_of_interest)

  const min_val = 0 // series.min()
  const max_val = series.max()


  let groups = dataframe_selected_parameter.groupBy(x => x.date);
  let lookup = {}
  for (const group of groups) {

    const dater = group.first().date;
    lookup[dater] = group.setIndex('location')

  }
  console.log("returning")
  const unique_dates = dataframe.getSeries('date').distinct().toArray()
  const unique_lineages = dataframe.getSeries('lineage').distinct().toArray()

  return { 'min_val': min_val, 'max_val': max_val, 'dataframe_selected_parameter': lookup, 'series': series, 'unique_dates': unique_dates,
'unique_lineages':unique_lineages }


}

var memoized_get_min_max = memoize(get_min_min_max)
let dataframe = loadData();
const Covid19 = () => {

  

  window.df = dataframe

  ///  [data, indexed_by_date, unique_dates, min_val, max_val] 
  const [parameter, setParameter] = useState("lambda");
  let unique_parameters = ['lambda','p','R']
  const parameter_of_interest = parameter
  const value_of_interest = "mean"

  const [lineage, setLineage] = useState("total");

  const { min_val, max_val, series, dataframe_selected_parameter, unique_dates, unique_lineages } = memoized_get_min_max(dataframe, parameter_of_interest, value_of_interest, lineage)
  window.df2 = dataframe_selected_parameter
  console.log(min_val, max_val)


  const[is_playing,setIsPlaying] = useState(false);


  const [tiles, setTiles] = useState([]);
  const [lad, setLad] = useState({
    lad: "E08000006",
    data: null,
    scale: null,
  });
  const [date, setDate] = useState({
    date: "2020-09-01",

  });

 


  const handleOnClick = (e, lad) => {
    setLad({ ...lad, lad, data: null });
  };

  const handleDateSlider = (e) => {
    const set_to = unique_dates[e];
    //console.log("date set to ", set_to)
    setDate({ date: set_to });


  };


  const bump_date = (e) => {
    const cur_index = unique_dates.indexOf(date.date)
    const set_to = unique_dates[cur_index+1]
    setDate({ date: set_to });


  };

  function togglePlay(){
    console.log("toggle")
    if(is_playing){
    setIsPlaying(false)
    clearInterval(window.bumpTimeout)
    }
    else{
      setIsPlaying(true)
      window.bumpTimeout = setInterval(() => this.bump_date(),100);
    }

  }

  function PlayButton(props) {
    return('')

    if(!props.is_playing){
    return (
    <button onClick={props.onClick}><FaPlay /></button>
    );
  }else{
    return (
    <button onClick={props.onClick}><FaPause /></button>);
  }
  }





  useEffect(() => {
    if (tiles.length === 0) setTiles(loadTiles());

  }, [tiles]);


  const lineage_options = unique_lineages.map((x) =><option>{x}</option>)

  if(lineage=="total"){
    unique_parameters = ['lambda','R']
  }
  const parameter_options = unique_parameters.map((x) =><option>{x}</option>)

  return (
    <React.Fragment>
      {tiles && tiles.length === 0 ? (
        <div className="row">
          <Spinner />
        </div>
      ) : (
          <div className="row">
            <div className="col-md-6">
              <h2>Map</h2>
              <select value={lineage} name="lineages" onChange={e => setLineage(e.target.value)}>
                {lineage_options}
              </select>
              <select value={parameter} name="parameters" onChange={e => setParameter(e.target.value)}>
                {parameter_options}
              </select>
              <Chloropleth
                tiles={tiles}
                max_val={max_val}
                min_val={min_val}
                dataframe={dataframe_selected_parameter}
                date={date.date}
                scale={date.scale}
                handleOnClick={handleOnClick}
              />
            </div>
            <div className="col-md-6">
              <h2>Select date</h2>
              <p className="lead"><PlayButton is_playing={is_playing} onClick={togglePlay} />Current date: {date.date}</p>

              <Slider
                min={0}
                max={unique_dates && unique_dates.length - 1}
                onChange={handleDateSlider}
                value={unique_dates.indexOf(date.date)}
              />
              <hr />

              {<LocalIncidence name={LALookupTable[lad.lad]} date={date.date} lad={lad.lad} dataframe={dataframe} lineage={lineage} />}

            </div>
          </div>
        )}
    </React.Fragment>
  );
};

export default Covid19;
