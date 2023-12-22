import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom/client';
import '../index.css'


export default function SideBar(){
    return (
        <>
        <section className='sidebar'>
                <header className='header'>
                    <h1>
                        Route Visualize
                    </h1>
                    
                </header>
                <section className='text'>
                    <p>
                        This is a route visulaization app to visualise a route 
                    </p>
                    <p>
                        Drop markers to start visualising a route, you can drop it by pressing the map for 1 second, also the markers are draggable
                        This uses hereMap Api to get the polyline and decode it to show the route.

                        Click on the marker to see theirs value
                    </p>
                    <form>
                        
                        
                    </form>

                </section>
                <footer className='footer'>
                    Footer
                </footer>
            </section>
        </>

    )
}