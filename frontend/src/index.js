import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { MapContainer, TileLayer,Marker,Popup,useMap, useMapEvents, Polyline} from 'react-leaflet'
import L from "leaflet";
import SideBar from './components/Sidebar';
import 'leaflet/dist/leaflet.css';
import { marker } from 'leaflet';
import './index.css';


const decode_integer = function(char){
  const decodingTable = [
    -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
        -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
        -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
        -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
        -1, -1, -1, -1, -1, 62, -1, -1, 52, 53,
        54, 55, 56, 57, 58, 59, 60, 61, -1, -1,
        -1, -1, -1, -1, -1,  0,  1,  2,  3,  4,
         5,  6,  7,  8,  9, 10, 11, 12, 13, 14,
        15, 16, 17, 18, 19, 20, 21, 22, 23, 24,
        25, -1, -1, -1, -1, 63, -1, 26, 27, 28,
        29, 30, 31, 32, 33, 34, 35, 36, 37, 38,
        39, 40, 41, 42, 43, 44, 45, 46, 47, 48,
        49, 50, 51
  ]
  return decodingTable[String(char).charCodeAt(0)];
}

const decode_header = function(encodedString){
  let header_version = decode_integer(encodedString[0]);
  let header_content = decode_integer(encodedString[1]);

  let precesion_2d = header_content & 0xF;
  return precesion_2d;

}

const decode_signed_deltas = function(encoded_deltas){ // input should be without header , i.e first header bytes{
  let values = [];
  let next_value = 0;
  let shift = 0;

  for (const character of encoded_deltas){
    let chunk = decode_integer(character);
    let is_last_chunk = (chunk & 0x20) == 0;
    let chunk_value = chunk & 0x1F;

     next_value = (chunk_value << shift) | next_value;
    shift = shift + 5;
    let signed_value ;
    if(is_last_chunk != 0){
      if(next_value&1 == 1){
        signed_value = -((next_value+1)>>1)
      }else{
        signed_value = next_value>>1;
      }
      values.push(signed_value);
      next_value = 0;
      shift = 0;
    }

  }
  return values ;
}


const decode_flexpolyline = function(deltas , precesion_2d){
  let coordinates = [];
  let lat = 0 , lon = 0;
  
  for(let i=0;i<deltas.length/2;i++){
    lat = lat + deltas[2*i];
    lon = lon + deltas[2*i+1];
    coordinates.push([lat/Math.pow(10,precesion_2d) ,lon/Math.pow(10,precesion_2d) ])

  }

  return coordinates;
}

const decode = function(encodedString){
  let precesion_2d = decode_header(encodedString);

  let encoded_deltas = decode_signed_deltas(encodedString.slice(2));
  let coordinates = decode_flexpolyline(encoded_deltas,precesion_2d);
  console.log("coordinates",coordinates);
  return coordinates;

}







const root = ReactDOM.createRoot(document.getElementById('root'));



const getpolyline = async function(markers){
  // if(markers.length > 2){throw new Error("length < 2"); }
  if(markers.length == 0)return;
  const len = markers.length;
  console.log("in polyline");
  console.log("markser" , markers);
  let waypoints = markers.slice(1 , len-1).map((marker)=>{
    return  "via=" + marker.position.lat + "," + marker.position.lng;
  })

  waypoints = waypoints.join('&');

  console.log(waypoints);

  const HERE_API_KEY = '9uYCO5Xf00-Z2eCvuAXdgQoir6eHgWauRCGTJDqK87k';
  const URL = `https://router.hereapi.com/v8/routes?origin=${markers[0].position.lat},${markers[0].position.lng}&transportMode=car&destination=${markers[len-1].position.lat},${markers[len-1].position.lng}&${waypoints}&return=polyline&apiKey=${HERE_API_KEY}`;
  console.log(URL);

    const resp = await fetch(URL);
    if(resp.ok){
      const data = await resp.json();
      const route = data.routes[0];
      
      return route.sections
    }
}


const calculateRoute = async(routeSection,markers)=>{
  let coordinates = [];
  try{
    console.log("calculateRoute");
    // let prevCoordinate = [markers[0].position.lat , markers[0].position.lng];
    routeSection.forEach((sec,ind) => {
      const encodedPolyline = sec.polyline;
      console.log("encodedPolyline");
      console.log(encodedPolyline);
      let decodedPolyline = decode(encodedPolyline);
      
      coordinates = [...coordinates , ...decodedPolyline];
      
    });
    
    
    return coordinates;

  }catch(err){
    console.log(err);
  }
  

}





const icon = L.icon({
  iconSize: [25, 40],
  iconAnchor: [10, 41],
  popupAnchor: [2, -40],
  iconUrl: "https://unpkg.com/leaflet@1.6/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.6/dist/images/marker-shadow.png"
});

const MarkerComponent = function({callBackUpdatePolyline}){

  const [markers , setMarkers] = useState([]);
  let pressTimer = useRef(null);
  


  useEffect(()=>{
    try{
      
      const createRoute = async function(){
        if(markers.length < 3)return;
        let sections = await getpolyline(markers);
       
        let coordinates = await calculateRoute(sections,markers);
        
        callBackUpdatePolyline(coordinates);
      }
      createRoute();

    }catch(err){
      console.log(err);
    }
    
    
  },[markers])


  const addMarker = (e)=>{

    let newMarker = {
      id : new Date().getTime(),
      index : (markers == null?1:markers.length + 1), 
      position : e.latlng,

    }
    setMarkers((prev)=>{
      return [...prev , newMarker ];
    })  ;


    

  }
  const map = useMap();

  const handleDragStart = (id , e)=>{
    console.log("dragging");
    clearTimeout(pressTimer);
    console.log(e);
    console.log(id);
  }

  const handleDragEnd = (id , e)=>{
    console.log(e.target._latlng);
    setMarkers(markers.map((marker)=>{
      if(marker.id == id){
        return {...marker , position : e.target._latlng};
      }else return marker;
    }));
  }


  const mapEvent = useMapEvents({
    mousedown(e){
      pressTimer = setTimeout(()=>{
        addMarker(e);
      },1000);
    },
    mouseup(){
      clearTimeout(pressTimer);
    },
    
  })
  



  return (
    (<>
      
        {
          markers.map((marker)=>{
            return <Marker key={marker.id} position={[marker.position.lat , marker.position.lng] } 
                    icon = {icon} draggable={true} 
                    eventHandlers={{
                      dragstart: (e)=>handleDragStart(marker.id , e),
                      dragend : (e)=>{handleDragEnd(marker.id , e)}
                    }}>
              <Popup>{marker.index}</Popup>
              </Marker>
              
          })
        }
      </>
      
    )
    
    
    
  )


}




const MapComponent = ()=>{

  const [map , setMap] = useState(null);
  const [position , setPosition] = useState([27,77]);
  const [polyline , setPolylines] = useState([]);

  const purpleOptions = { color: 'purple' };


  // let pressTimer;
  const updatePolyline = function(data){
    // console.log("coordinates  mapComponent")
    // console.log(data);
    setPolylines(data);
    console.log(data);
    
  }

  const handleMapInit = (map)=>{
    console.log("map init");
    setMap(map);
  }

 

  




  return (

    <>
      <section className='main'>
        <MapContainer center={position} zoom={12} scrollWheelZoom={true}  whenReady={handleMapInit} style={{"height":"100%" , "width":"100%"}} >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
        
          <MarkerComponent callBackUpdatePolyline = {updatePolyline}/>
          <Polyline pathOptions={purpleOptions} positions={polyline}/>
        
        </MapContainer>
      </section>

      
    </>
    
    

    
  );
}










root.render(
  <>
    <div className='grid-container'>
      <SideBar/>
      <MapComponent/>
    </div>
    
  </>
    
 
  
)