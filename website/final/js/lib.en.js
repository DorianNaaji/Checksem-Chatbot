var lastIntent = null;

/*
 * called after the complete loading of the page
 */
window.onload = function() 
{
    //we retrieve the button
    var bouton = document.getElementById("btn-ok");

    //we retrieve the textbox
    var textBox = document.getElementById("txt-srch");

    // we attach a listener on the textbox for the enter keypress
    textBox.addEventListener("keyup", function(event) 
    {
        event.preventDefault();
        if (event.keyCode == 13) 
        {
            document.getElementById("btn-ok").click();
        }
    });
    //We attach a listener to the button for the request
    bouton.addEventListener("click", startRequest); 
}

/*
 * Function calling different requests (to RASA and then to DBPEDIA)
 * when the user talks to the bot.
 * RASA is requested to the adress /chatbotproject/proxy/ because this URL redirects
 * to 91.236.239.61:8080/parse?q=
 * all the content on the right of "q=" is the query that RASA will analyze
 * Port 8080 is the port where the RASA HTTP server runs. (see rasa doc)
 */ 
function startRequest() 
{
    var txtReq = document.getElementById("txt-srch");
    var query = "http://91.236.239.61/chatbotproject/proxy/";

    if (txtReq) 
    {
        query += txtReq.value;
        query += "&project=chatbot_en";
        rasaQueryJson(query, callbackRasa, true);
        txtReq.value = "";
    }
}



/*
##############################################################
															 #
															 #
			MANAGING QUERIES : RASA AND DBPEDIA				 #
				  (WITH XMLHTTP REQUESTS)					 #
															 #
															 #
 #############################################################
*/

/*
 * This function allows to send a request to RASA NLU which runs on the port 8080 of the server.
 * In order to do this, the URL of the request is the following :
 * "http://91.236.239.61/chatbotproject/proxy/" because in the NGINX.CONF file, we redirect this
 * precise URL to "http://127.0.0.1:8080/parse?q=", which is the adress where we can parse
 * sentences and transform it into structured data (JSON). see doc RASA.
 * Everything which is on the right of the URL (on the right of "q=") is the sentence to parse.
 */
function rasaQueryJson(url, callback, isDebug) 
{

    var xmlhttp = null;
    if (window.XMLHttpRequest) 
    {
        xmlhttp = new XMLHttpRequest();
    } 
    else 
    {
        alert('Your navigator may not support XMLHttpRequests. Try with a more recent navigator');
    }

    // setting up a POST request to receive the result from rasa in JSON
    xmlhttp.open('GET', url, true);

    // Setting up the callback
    xmlhttp.onreadystatechange = function() 
    {
        if (xmlhttp.readyState == 4) 
        {
            if (xmlhttp.status == 200) 
            {
                callback(xmlhttp.responseText);
            } 
            else 
            {
                // exception ?
                alert("Unexpected error (RASA)");
            }
        }
    };

    xmlhttp.send();

    // waiting for callback
};

/*
 * function allowing to request DBPEDIA in SPARQL in order to receive a JSON object
 */
function sparqlQueryJson(queryStr, endpoint, callback, isDebug) 
{
    var querypart = "query=" + escape(queryStr);
    var xmlhttp = null;
    if (window.XMLHttpRequest) 
    {
        xmlhttp = new XMLHttpRequest();
    } 
    else if (window.ActiveXObject) 
    {
        // for IE6 or older
        xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
    } 
    else 
    {
        alert('Your navigator may not support XMLHttpRequests. Try with a more recent navigator');
    }

    // setting up a post request to receive the result in json
    xmlhttp.open('POST', endpoint, true);
    xmlhttp.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
    xmlhttp.setRequestHeader("Accept", "application/sparql-results+json");

    // setting up the callback
    xmlhttp.onreadystatechange = function() 
    {
        if (xmlhttp.readyState == 4) 
        {
            if (xmlhttp.status == 200) 
            {
                callback(xmlhttp.responseText);
            } 
            else 
            {
                // exception ?
                alert("SPARQL QUERY ERROR - PLEASE TRY AGAIN WITH ANOTHER SENTENCE  (" + xmlhttp.status + " " + xmlhttp.responseText + ")");
            }
        }
    };
    xmlhttp.send(querypart);

    // waiting for callback
};



/*
##############################################################
															 #
															 #
						SPARQL QUERIES  				     #
															 #
															 #
 #############################################################
*/

/* update 11/04/2021
   code is pretty old now and some huges changes should be done but well ;
   the SPARQL url request changed, so it had to be updated for each of the bellow functions.
   a global const var would be better but I don't wanna break anything since the code is quite old.
   var endpoint = "http://dbpedia.org/sparql"; -> var endpoint = "https://dbpedia.org/sparql?default-graph-uri=http%3A%2F%2Fdbpedia.org&";
*/

/*
 * SPARQL request  to obtain a given word's definition
 */
function querySparqlDefinition(word)
{
    var mot = capitalizeFirstLetter(word);
    var endpoint = "https://dbpedia.org/sparql?default-graph-uri=http%3A%2F%2Fdbpedia.org&";
    var query = "PREFIX dbo: <http://dbpedia.org/ontology/> PREFIX res: <http://dbpedia.org/resource/> SELECT ?def WHERE { res:" + mot + " dbo:abstract ?def. FILTER (lang(?def) = 'en')}";
    sparqlQueryJson(query, endpoint, callbackDefinition, true);
}


/*
 * SPARQL request to obtain a given word's domain of use / subject
 */
function querySparqlSubject(word)
{
    var mot = capitalizeFirstLetter(word);
    var endpoint = "https://dbpedia.org/sparql?default-graph-uri=http%3A%2F%2Fdbpedia.org&";
    var query = "PREFIX dcterms: <http://purl.org/dc/terms/> PREFIX res: <http://dbpedia.org/resource/> SELECT ?subject WHERE { res:" + mot + " dct:subject ?subject }";
    sparqlQueryJson(query, endpoint, callbackSubject, true);
}

/*
 * SPARQL request returning all the existing Translations of a word
 */
function querySparqlAllTranslations(word) 
{
    var mot = capitalizeFirstLetter(word);
    var endpoint = "https://dbpedia.org/sparql?default-graph-uri=http%3A%2F%2Fdbpedia.org&";
    var query = "PREFIX res: <http://dbpedia.org/resource/> PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> SELECT ?trad (lang(?trad) as ?lang) WHERE { res:" + mot + " rdfs:label ?trad }";
    sparqlQueryJson(query, endpoint, callbackTranslation, true);
}


/*
 * SPARQL request to obtain Translation(s) in given language(s)
 */
function querySparqlTranslations(word, languages) 
{
    var languagesTag = new Array();
    for (var i = 0; i < languages.length; i++)
    {
        languagesTag[i] = languageStrToLanguageTag(languages[i]);
    }
    var mot = capitalizeFirstLetter(word);
    var endpoint = "https://dbpedia.org/sparql?default-graph-uri=http%3A%2F%2Fdbpedia.org&";
    if (languagesTag.length == 1)
    {

        var query = "PREFIX res: <http://dbpedia.org/resource/> PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> SELECT ?trad (lang(?trad) as ?lang) WHERE { res:" + mot + " rdfs:label ?trad. FILTER (lang(?trad) = '" + languagesTag[0] + "') }";
        sparqlQueryJson(query, endpoint, callbackTranslation, true);
    }
    else if (languagesTag.length > 1)
    {
        var query = "PREFIX res: <http://dbpedia.org/resource/> PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> SELECT ?trad (lang(?trad) as ?lang) WHERE { res:" + mot + " rdfs:label ?trad. FILTER (lang(?trad) = '" + languagesTag[0] + "'";
        for (var i = 1; i < languagesTag.length; i++)
        {
            query += " || lang(?trad) = '" + languagesTag[i] + "'";
        }
        query += ") }";
        sparqlQueryJson(query, endpoint, callbackTranslation, true); 
    }
}

/*
##############################################################
															 #
															 #
			CALLBACKS MADE AFTER THE XMLHTTPS REQUEST	     #
			-> YOU CANCHANGE THOSE CALLBACKS TO DO           #
			WHAT EVER YOU WANT AFTER OBTAINING THE JSON      #
					RESULTS OF DBPEDIA / RASA             	 #
															 #
															 #
 #############################################################
*/


/*
 * Function defining a callback to receive the result of the request sent to RASA in JSON.
 * This function is meant to change depending on what we want to do with the result of the request made
 * to RASA and the different elements contained in the JSON (which themselves depend of the dataset)
 * see doc RASA
 */
function callbackRasa(str) 
{
    var jsonObj = eval('(' + str + ')');
    var intent = jsonObj.intent_ranking[0].name;

    if (intent == 'greet_user')
    {
        var result = '<li class="sent">';
        result += '<img src="img/chatbot.png" alt="" />';
        var rand = Math.floor((Math.random() * 5) + 1);
        switch (rand)
        {
            case 1:
                result += "<p> Hello ! Feel free to ask me something. </p>";
                break;
            case 2:
                result += "<p> Hey there. </p>";
                break;
            case 3:
                result += "<p> Hello ! Ready to learn something ? </p>";
                break;
            case 4:
                result += "<p> Hey ! </p>";
                break;
            case 5:
                result =+ "<p> Hello ! </p>";
                break;
        }
        result += "</li>";
        var doc = document.getElementById('mess');
        doc.insertAdjacentHTML('beforeend', result);
    }

    if (intent == 'search_word_definition')
    {
        lastIntent = 'definition';
        var researchedWord = jsonObj.entities[0].value;
        querySparqlDefinition(researchedWord);
    }

    if (intent == 'search_word_translation')
    {
        lastIntent = 'translation';
        // case 1 : we only have a requested Translation for a word (the language is not specified) :
        // we request dbpedia to obtain the Translations of the word in every language available on dbpedia
        if (jsonObj.entities.length == 1)
        {
            var researchedWord = jsonObj.entities[0].value;
            querySparqlAllTranslations(researchedWord);
        }
        // case 2 :
        // we have the language(s) wanted for the Translation
        if (jsonObj.entities.length > 1)
        {
            var researchedWord = "";
            for (var i = 0; i < jsonObj.entities.length; i++)
            {
                if (jsonObj.entities[i].entity == "word")
                {
                    researchedWord = jsonObj.entities[i].value;
                }
            }
            var languages = new Array();
            var j = 0;
            for (var i = 0; i < jsonObj.entities.length; i++)
            {
                if (jsonObj.entities[i].entity == "language")
                {
                    languages[j] = jsonObj.entities[i].value;
                    j++;
                }
            }
            querySparqlTranslations(researchedWord, languages);  
        }
    }

    if (intent == 'search_word_fields' || intent == 'search_word_synonyms')
    {
        lastIntent = 'relative_words';
        var researchedWord = jsonObj.entities[0].value;

        // not the best solution to retrieve the researched word,
        // has to be changed for a better option. we used localStorage
        // as a global var
        localStorage.setItem("word", researchedWord);
        querySparqlSubject(researchedWord);
    }
}

/*
 * Callback for a definition request : constructs a message in the chat frame.
 */
function callbackDefinition(str) 
{
    var jsonObj = eval('(' + str + ')');
    // construction of the html table
    result = '<li class="sent">';
    result += '<img src="img/chatbot.png" alt="" />';
    try
    {
        result += "<p><bold><u> DEFINITION</u> : </bold>";
        result += jsonObj.results.bindings[0].def.value + "</p>";
    }
    catch(e)
    {
        result += "No definitions found for this word... Try with another one or check the spelling";
    }
    result += "</li>";
    var doc = document.getElementById('mess');
    doc.insertAdjacentHTML('beforeend', result);

    var rand = Math.floor((Math.random() * 5) + 1);
    if (rand <= 6)
    {
        displayDialog(lastIntent); 
    }
}

/*
 * Callback for a Translation request : constructs an html table containing given Translations
 */
function callbackTranslation(str)
{
    var jsonObj = eval('(' + str + ')');

    result = '<li class="sent">';
    result += '<img src="img/chatbot.png" alt="" />';
    result += '<table class="container" id="trad">';
    result += "<tr> <td> TRANSLATION </td> <td> LANGUAGE </td> </tr>";
    if (jsonObj.results.bindings.length == 0)
    {
        result += "<tr><td> No Translations found for this word... Try with another one or check the spelling</td>";
        result += "<td> none </td></tr>";
    }
    else
    {
        for (var i = 0; i < jsonObj.results.bindings.length; i++) 
        {
            result += " <tr><td>" + jsonObj.results.bindings[i].trad.value;
            var language = LanguageTagToLanguageStr(jsonObj.results.bindings[i].lang.value);
            result += " </td><td>" + '<img src="img/flags/' + jsonObj.results.bindings[i].lang.value + '.png"> ' + language;
            result += " </td></tr>";
        }
    }
    result += "</table>";
    result += "</li>";
    var doc = document.getElementById('mess');
    doc.insertAdjacentHTML('beforeend', result);   

    var rand = Math.floor((Math.random() * 5) + 1);
    if (rand <= 6)
    {
        displayDialog(lastIntent); 
    }
}
    
/*
 * Constructs an object for the function appendTree() which will use D3.JS (see the end of this file)
 * Can be changed to construct a table like for translations.
 */
function callbackSubject(str)
{
    var jsonObj = eval('(' + str + ')');
    

    var result = '<li class="sent">';
    result += '<img src="img/chatbot.png" alt="" />';


    "<p><bold><u> RELATED WORDS / SYNONYMS </u> : </bold>";
    if (jsonObj.results.bindings.length == 0)
    {
        result += "<p> No synonyms / related words found for this word... Try with another one or check the spelling</p>";
    }
    else
    {
        //as said, not the best solution to retrieve the word
        var researchedWord = capitalizeFirstLetter(localStorage.getItem("word"));
        var d3Object = {};
        d3Object.name = [researchedWord];
        d3Object.parent = ['null'];
        d3Object.children = [];
        for (var i = 0; i < jsonObj.results.bindings.length; i++) 
        {
            var cleanWord = jsonObj.results.bindings[i].subject.value.replace('http://dbpedia.org/resource/Category:', '');
            cleanWord = replaceAll(cleanWord, '_', ' ');
            d3Object.children.push({});
            d3Object.children[i]['name'] = cleanWord;
            d3Object.children[i]['parent'] = researchedWord;
        }
        var jsonString = JSON.stringify(d3Object);
        appendTree(jsonString);
    }
    var rand = Math.floor((Math.random() * 5) + 1);
    if (rand <= 6)
    {
        displayDialog(lastIntent); 
    }
}


/*
##############################################################
															 #
															 #
						MANAGING STRINGS 				     #
															 #
															 #
 #############################################################
*/

/*
 * Function replacing occurences of a given substring for a string
 * @param str : the string in which we want to replace a substring
 * @param find : the substring to replace
 * @param replace : the string that will replace the occurences of the parameter "find"
 */
function replaceAll(str, find, replace) 
{
    return str.replace(new RegExp(find, 'g'), replace);
}

/*
 * Returns a given string with the first letter capitalized
 * (we first unify the string (lowercase) so we won't have SPARQL problems)
 */
function capitalizeFirstLetter(string) 
{
    var str = string.toLowerCase();
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/*
 * Function returning a ISO 639-1 code for the language (necessary to filter dpbedia results)
 */
function languageStrToLanguageTag(language)
{
    var lang = capitalizeFirstLetter(language);
    switch(lang)
    {
        case "German":
            return "de";
            break;
        case "English":
        	return "en";
        	break;
        case "Japanese":
            return "ja";
            break;
        case "Arabian":
            return "ar";
            break;
        case "Spanish":
            return "es";
            break;
        case "French":
            return "fr";
            break;
        case "Italian":
            return "it";
            break;
        case "Dutch":
            return "nl";
            break;
        case "Polish":
            return "pl";
            break;
        case "Portuguese":
            return "pt";
            break;
        case "Russian":
            return "ru";
            break;
        case "Chinese":
            return "zh";
            break;
    }
}

/*
 * Opposite of "languageStrToLanguageTag(language)" : Function returning a litteral language with a given iso code.
 */
function LanguageTagToLanguageStr(tag)
{
	switch(tag)
	{
		case "de":
            return "German";
            break;
       	case "en":
       		return "English";
       		break;
        case "ja":
            return "Japanese";
            break;
        case "ar":
            return "Arabian";
            break;
        case "es":
            return "Spanish";
            break;
        case "fr":
            return "French";
            break;
        case "it":
            return "Italian";
            break;
        case "nl":
            return "Dutch";
            break;
        case "pl":
            return "Polish";
            break;
        case "pt":
            return "Portuguese";
            break;
        case "ru":
            return "Russian";
            break;
        case "zh":
            return "Chinese";
            break;
	}
}


/*
##############################################################
                                                             #
                                                             #
                    EXTRA FUNCTIONNALITY                     #
                                                             #
                                                             #
 #############################################################
*/

/*
 * Displays some dialog to makes the user experience more attractive
 */
function displayDialog(intent)
{
    if (intent == 'definition')
    {
        var result = '<li class="sent">';
        result += '<img src="img/chatbot.png" alt="" />';
        var rand = Math.floor((Math.random() * 5) + 1);
        switch (rand)
        {
            case 1:
                result += "<p> Is there another definition you want to know ? :) </p>";
                break;
            case 2:
                result += "<p> Seems a bit complicated... Do you want me to define another word ? :D </p>";
                break;
            case 3:
                result += "<p> You can also ask me for translations and synonyms !  ;) </p>";
                break;
            case 4:
                result += "<p> Atleast tell me I learnt you something ! </p>";
                break;
            case 5:
                result += "<p> It seems so easy to me. I know everything. </p>";
                break;
        }
        result += "</li>";
        var doc = document.getElementById('mess');
        doc.insertAdjacentHTML('beforeend', result);
    }

    if (intent == 'translation')
    {
        var result = '<li class="sent">';
        result += '<img src="img/chatbot.png" alt="" />';
        var rand = Math.floor((Math.random() * 5) + 1);
        switch (rand)
        {
            case 1:
                result += "<p> I know so much things :p . </p>";
                break;
            case 2:
                result += "<p> You are gonna learn some new vocabulary thanks to me ! </p>";
                break;
            case 3:
                result += "<p> These languages are so easy to me... Go on, ask me something ! :D </p>";
                break;
            case 4:
                result += "<p> I know so much things :D </p>";
                break;
            case 5:
                result += "<p> You can also ask me for definitions and synonyms ! </p>";
                break;
        }
        result += "</li>";
        var doc = document.getElementById('mess');
        doc.insertAdjacentHTML('beforeend', result);
    }

    if (intent == 'relative_words')
    {
        var result = '<li class="sent">';
        result += '<img src="img/chatbot.png" alt="" />';
        var rand = Math.floor((Math.random() * 5) + 1);
        switch (rand)
        {
            case 1:
                result += "<p> You are gonna learn some new vocabulary thanks to me ! </p>";
                break;
            case 2:
                result += "<p> Those words are not familiar at all to me. </p>";
                break;
            case 3:
                result += "<p> Maybe you want me to search for something else ? </p>";
                break;
            case 4:
                result += "<p> I can also give you definitions and translations ! </p>";
                break;
            case 5:
                result += "<p> I hope you've atleast learnt something ! </p>";
                break;
        }
        result += "</li>";
        var doc = document.getElementById('mess');
        doc.insertAdjacentHTML('beforeend', result);
    }
}




/*
####################################################################################################################
                                        D3.JS MANAGING - APPAREANCE
####################################################################################################################
*/

// these are global vars. only way we found to update the SVG when clicking on it.    

// dimensions of the svg we want to create for the synonyms
var margin = 
    {
        top: 20, right: 120, bottom: 20, left: 80
    },
width = 500 - margin.right - margin.left,
height = 400 - margin.top - margin.bottom;    

// other vars
var i,
duration,
root;
var tree;

var diagonal = d3.svg.diagonal()
    .projection(function(d) 
    { 
        return [d.y, d.x]; 
    });

// the svg
var svg; 


/*
 * Function called after the callbackSubject : creates a tree with a json object in parameter, in string format. 
 */
function appendTree(jsonString)
{
    i = 0;
    duration = 750;
    tree = d3
        .layout
        .tree()
        .size([360, 260]);
    svg = d3
        .select("ul#mess")
        .append("li")
        .attr("class", "sent")
        .append("svg")
        .attr("width", width + margin.right + margin.left)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    // retrieving data
    var toParse = '[' + jsonString + ']';
    var json = JSON.parse(toParse);
    var treeData = json;

    root = treeData[0];
    root.x0 = height / 2;
    root.y0 = 0;
    update(root);
    d3.select(self.frameElement).style("height", "500px");
}



/*
 * Function managing and appareance
 */
function update(source) 
{
    // setting up the layout for the tree
    var nodes = tree.nodes(root).reverse(),
    links = tree.links(nodes);

    // we manage depth
    nodes.forEach(function(d) 
    {
        d.y = d.depth * 180; 
    });

    // actualization of the nodes
    var node = svg
        .selectAll("g.node")
        .data(nodes, function(d) 
        { 
            return d.id || (d.id = ++i); 
        });

    // allow to make nodes disappearing with animations
    var nodeEnter = node
        .enter()
        .append("g")
        .attr("class", "node")
        .attr("transform", function(d) 
        { 
            return "translate(" + source.y0 + "," + source.x0 + ")"; 
        })
        .on("click", click);

    nodeEnter.append("circle")
        .attr("r", 1e-6)
        .style("fill", function(d) 
        { 
            return d._children ? "lightsteelblue" : "#fff"; 
        });

    nodeEnter.append("text")
        .attr("x", function(d) 
        { 
            return d.children || d._children ? -13 : 13; 
        })
        .attr("dy", ".35em")
        .attr("text-anchor", function(d) 
        { 
            return d.children || d._children ? "end" : "start"; 
        })
        .text(function(d) 
        { 
            return d.name; 
        })
        .style("fill-opacity", 1e-6);

    // managing transitions
    var nodeUpdate = node
        .transition()
        .duration(duration)
        .attr("transform", function(d) 
        { 
            return "translate(" + d.y + "," + d.x + ")"; 
        });

    nodeUpdate
        .select("circle")
        .attr("r", 10)
        .style("fill", function(d) 
        { 
            return d._children ? "lightsteelblue" : "#fff"; 
        });

    nodeUpdate
        .select("text")
        .style("fill-opacity", 1);

    // managing transitions
    var nodeExit = node
        .exit()
        .transition()
        .duration(duration)
        .attr("transform", function(d)
        { 
            return "translate(" + source.y + "," + source.x + ")"; 
        })
        .remove();

    nodeExit
        .select("circle")
        .attr("r", 1e-6);

    nodeExit
        .select("text")
        .style("fill-opacity", 1e-6);

    // actualization of the links
    var link = svg
        .selectAll("path.link")
        .data(links, function(d) 
        { 
            return d.target.id; 
        });

    // managing links
    link
        .enter()
        .insert("path", "g")
        .attr("class", "link")
        .attr("d", function(d) 
        {
            var o = 
            {
                x: source.x0, y: source.y0
            };
            return diagonal(
            {
                source: o, target: o
            });
        });

    // transitions of links
    link
        .transition()
        .duration(duration)
        .attr("d", diagonal);

    // managing transitions
    link
        .exit()
        .transition()
        .duration(duration)
        .attr("d", function(d) 
        {
            var o = 
            {
                x: source.x, y: source.y
            };
            return diagonal(
            {
                source: o, target: o
            });
        })
        .remove();

    // keep position in memory
    nodes.forEach(function(d) 
    {
        d.x0 = d.x;
        d.y0 = d.y;
    });
}

// display children on click
function click(d) 
{
    if (d.children) 
    {
        d._children = d.children;
        d.children = null;
    } 
    else 
    {
        d.children = d._children;
        d._children = null;
    }
    update(d);
}
