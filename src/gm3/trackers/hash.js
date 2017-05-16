/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2017 Dan "Ducky" Little
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */


import React from 'react';
import { connect } from 'react-redux';

import { getVisibleLayers } from '../actions/mapSource';
import * as mapActions from '../actions/map';
import { MAPSOURCE } from '../actionTypes';

import * as util from '../util';

// node's url parser
import * as url from 'url';


/** Class for tracking the state of the user in localStorage
 *
 */
export default class HashTracker {

    constructor(store) {
        this.tracking = false;

        // localize the store.
        this.store = store;

        // when the store changes, track those changes.
        store.subscribe(() => { this.track(); });

        // track the last hash, don't update the window
        //  if it need not be updated.
        this.lastHash = '';

        this.joinSymbol = ';';
    }

    /** turn on tracking.
     */
    startTracking() {
        this.tracking = true;
    }

    /** turn off tracking.
     */
    stopTracking() {
        this.tracking = false;
    }

    /* Batch and issue commands to handle the restoration of layers.
     */
    restoreLayers(layersOn) {
        // get the list of layers from the query.
        const layers = layersOn.split(this.joinSymbol);

        // check for what the visible layers are now.
        const visible_layers = getVisibleLayers(this.store);

        // layers to turn on
        const turn_off = [];
        const turn_on = [];

        for(var i = 0, ii = layers.length; i < ii; i++) {
            // the layer from the URL is not "visible"
            if(visible_layers.indexOf(layers[i]) < 0) {
                turn_on.push(layers[i]);
            } 
        }

        for(var i = 0, ii = visible_layers.length; i < ii; i++) {
            if(layers.indexOf(visible_layers[i]) < 0) {
                turn_off.push(visible_layers[i]);
            }
        }

        for(var layer of turn_on) {
            this.store.dispatch({
                type: MAPSOURCE.LAYER_VIS,
                mapSourceName: util.getMapSourceName(layer),
                layerName: util.getLayerName(layer),
                on: true
            })
        }


        for(var layer of turn_off) {
            this.store.dispatch({
                type: MAPSOURCE.LAYER_VIS,
                mapSourceName: util.getMapSourceName(layer),
                layerName: util.getLayerName(layer),
                on: false
            })
        }

        /*
        // get the favorites list
        let faves = localStorage.getItem('favorites');

        if(faves) {
            // convert the 'faves' into a list of objects.
            faves = faves.split(';');

            // if there were favorites saved, for each one,
            //  issue a 'FAVORITES' command for the mapsource.
            if(faves && faves.length) {
                for(const fave of faves) {
                    let ms_name = util.getMapSourceName(fave);
                    let layer_name = util.getLayerName(fave);
                    this.store.dispatch(favoriteLayer(ms_name, layer_name, true));
                }
            }
        }
        */

    }

    /* Restore the location from the hash
     *
     */
    restoreLocation(loc) {
        // I wholly believe that map/forEach is evil,
        //  but this code is rather elegant when written this way.
        const zxy = loc.split(this.joinSymbol).map(parseFloat);
        this.store.dispatch(mapActions.setView({
            // unset the "zoom level" which normally takes precendent.
            zoom: null, 
            center: [zxy[1], zxy[2]],
            resolution: zxy[0]
        }));
    }


    /** Issue the set of commands that will 'restore'
     *  the previous state.
     */
    restore() {
        // take the hash and parse it like a query string.
        // The "substring(1)" removes the "#" from the leading edge,
        //  replacing it with the '?' then cuases the hash to be parsed like
        //  a normal query string.
        const parsed = url.parse('?' + window.location.hash.substring(1), true);

        if(parsed.query) {
            if(parsed.query.loc) {
                this.restoreLocation(parsed.query.loc);
            }
            if(parsed.query.on) {
                this.restoreLayers(parsed.query.on);
            }
        }
    }

    /* Track which layers are on in the hash.
     */
    trackLayers() {
        return getVisibleLayers(this.store);
    }

    /* Get the location.
     */
    trackLocation(map) {
        return {
            x: map.center[0],
            y: map.center[1],
            z: map.resolution
        }
    }

    track() {
        // when tracking is not active, just return null.
        if(this.tracking) {
            let new_hash = '';

            const state = this.store.getState();

            // put the layers in the hash
            new_hash += 'on=' + this.trackLayers().join(this.joinSymbol);

            // get the locaiton in htere.
            const loc = this.trackLocation(state.map);
            new_hash += '&loc=' + [loc.z, loc.x, loc.y].join(this.joinSymbol); 

            if(this.lastHash !== new_hash) {
                window.location.hash = new_hash;
                this.lastHash = new_hash;
            }
        }

        // no DOM components to render.
        return null;
    }
}
