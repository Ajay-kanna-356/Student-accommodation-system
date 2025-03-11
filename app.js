const express = require("express");
const bodyparser = require("body-parser");
const https = require("https");
const path = require('path');
app = express();
app.set('view engine','ejs');
app.set('views', path.resolve('./views')); // Set views folder
app.use(express.urlencoded({ extended: true })); //Makes form data accessible via req.body.
app.get("/",function(req,res){
    res.sendFile(__dirname+"/public/home.html");
});
app.get("/details",function(req,res){
    const val = req.query.value;  //getting query paramaters
    res.sendFile(__dirname+"/public/details.html");
});
app.post("/details", (req, res) => {
    const ac = req.body.AC;
    const lift = req.body.lift;
    const net = req.body.internet;
    let cond;
    if((ac && lift) || (ac && lift && net) || (ac) || (ac && net)){
        cond = "internet_access,wheelchair";
    }
    else if(lift){
        cond = "wheelchair";
    }
    else if(net){
        cond = "internet_access";
    }
    else{
        cond = null;
    }
    console.log(cond);
    const results = req.body.no_results || 20;
    const type = req.body.value;
    const a = req.body.address;
    const r = req.body.radius*1000;
    const mykey = "4b5bc48ab4ab4bb1aa76d86232668660";
    const url1 = `https://api.geoapify.com/v1/geocode/search?text=${a}&limit=1&apiKey=${mykey}`;

    https.get(url1, (response) => {
        let data = "";
// sometimes emits data is emitted in chunks, meaning the data might not arrive as a complete JSON object in one event

        response.on("data", (chunk) => {
            data += chunk;
        });

        response.on("end", () => {
            try {
                const locationData = JSON.parse(data);
//Without optional chaining(?), trying to access a property of undefined or null will throw a runtime error:
                const lat = locationData.features[0]?.geometry?.coordinates[1];
                const lon = locationData.features[0]?.geometry?.coordinates[0];

                if (!lat || !lon) {
                    res.write("Could not fetch latitude and longitude.");
                    return res.end();
                }
                // Second API call using the latitude and longitude
                let url2;
                if (cond){
                    url2 = `https://api.geoapify.com/v2/places?categories=accommodation.${type}&conditions=${cond} &filter=circle:${lon},${lat},${r}&limit=${results}&apiKey=${mykey}`;
                }
                else{
                    url2 = `https://api.geoapify.com/v2/places?categories=accommodation.${type} &filter=circle:${lon},${lat},${r}&limit=${results}&apiKey=${mykey}`;
                }
                console.log(url2);
                https.get(url2, (response2) => {
                    let data2 = "";
                    response2.on("data", (chunk) => {
                        data2 += chunk;
                    });

                    response2.on("end", () => {
                        try {
                            const detailsData = JSON.parse(data2);
                            let arr = detailsData.features;
                            const len = arr.length;
                            let result = [];
                            for(let i = 0;i<len;i++){
                                // if hostel have no name then it wont be displayed 
                                //  ? optional chaining will prevent an error and just return undefined if any property isnt available 
                                let baseprice;
                                if (type == "apartment"){
                                     baseprice = 14000;
                                }
                                else{
                                    baseprice = 5000;
                                }
                                if(detailsData.features[i]?.properties?.facilities?.internet_access && detailsData.features[i]?.properties?.facilities?.wheelchair){
                                    baseprice += 5000;
                                }
                                else if(detailsData.features[i]?.properties?.facilities?.wheelchair){
                                    baseprice += 2000;
                                }
                                else if (detailsData.features[i]?.properties?.facilities?.internet_access){
                                    baseprice += 1000;
                                }
                                if (detailsData.features[i].properties.name){
                                const data = {
                                    "Name":detailsData.features[i]?.properties?.name,
                                    "Address":  detailsData.features[i]?.properties?.formatted,
                                    "Email":  detailsData.features[i].properties.datasource.raw.email || null,  //if the value is undefined or falsy return null
                                    "Phone": detailsData.features[i].properties.datasource.raw.phone || null,
                                    "Website": detailsData.features[i].properties.website || null,
                                    "price_range": baseprice+"-"+(baseprice+5000)
                                }
                                result.push(data);
                            }
                            }
                            res.render('display',{results:result});    // Pass the array to the EJS file
                        } catch (error) {
                            console.log(error);
                            res.write("Error parsing second API response.");
                            res.end();
                        }
                    });

                    response2.on("error", (error) => {
                        res.write(`Error with second API call: ${error.message}`);
                        res.end();
                    });
                });
            } catch (error) {
                res.write("Error parsing first API response.");
                res.end();
            }
        });

        response.on("error", (error) => {
            res.write(`Error with first API call: ${error.message}`);
            res.end();
        });
    });
});
app.listen(2000,function(req,res){
    console.log("port running in 2000");
});