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
        query += "&project=chatbot_fr";
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
    var query = "PREFIX dbo: <http://dbpedia.org/ontology/> PREFIX res: <http://fr.dbpedia.org/resource/> SELECT ?def WHERE { res:" + mot + " dbo:abstract ?def . FILTER (lang(?def) = 'fr') }";
    sparqlQueryJson(query, endpoint, callbackDefinition, true);
}

/*
 * SPARQL request returning all the existing Translations of a word
 */
function querySparqlAllTranslations(word) 
{
    var mot = capitalizeFirstLetter(word);
    var endpoint = "https://dbpedia.org/sparql?default-graph-uri=http%3A%2F%2Fdbpedia.org&";
    var query = "PREFIX res: <http://fr.dbpedia.org/resource/> PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> SELECT ?trad (lang(?trad) as ?lang) WHERE { res:" + mot + " rdfs:label ?trad }";
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

        var query = "PREFIX res: <http://fr.dbpedia.org/resource/> PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> SELECT ?trad (lang(?trad) as ?lang) WHERE { res:" + mot + " rdfs:label ?trad. FILTER (lang(?trad) = '" + languagesTag[0] + "') }";
        sparqlQueryJson(query, endpoint, callbackTranslation, true);
    }
    else if (languagesTag.length > 1)
    {
        var query = "PREFIX res: <http://fr.dbpedia.org/resource/> PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> SELECT ?trad (lang(?trad) as ?lang) WHERE { res:" + mot + " rdfs:label ?trad. FILTER (lang(?trad) = '" + languagesTag[0] + "'";
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

    if (intent == 'saluer_utilisateur')
    {
        var result = '<li class="sent">';
        result += '<img src="img/chatbot.png" alt="" />';
        var rand = Math.floor((Math.random() * 5) + 1);
        switch (rand)
        {
            case 1:
                result += "<p> Salut ! Posez-moi une question :) ! </p>";
                break;
            case 2:
                result += "<p> Bonjour !</p>";
                break;
            case 3:
                result += "<p> Bonjour ! Prêt à apprendre de nouvelles choses ? </p>";
                break;
            case 4:
                result += "<p> Hey ! </p>";
                break;
            case 5:
                result =+ "<p> Salut ! </p>";
                break;
        }
        result += "</li>";
        var doc = document.getElementById('mess');
        doc.insertAdjacentHTML('beforeend', result);
    }

    if (intent == 'recherche_definition')
    {
        lastIntent = 'definition';
        var researchedWord = jsonObj.entities[0].value;
        querySparqlDefinition(researchedWord);
    }

    if (intent == 'recherche_traduction')
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
                if (jsonObj.entities[i].entity == "mot")
                {
                    researchedWord = jsonObj.entities[i].value;
                }
            }
            var languages = new Array();
            var j = 0;
            for (var i = 0; i < jsonObj.entities.length; i++)
            {
                if (jsonObj.entities[i].entity == "langue")
                {
                    languages[j] = jsonObj.entities[i].value;
                    j++;
                }
            }
            querySparqlTranslations(researchedWord, languages);  
        }
    }

    if (intent == 'recherche_mots_apparentés' || intent == 'recherche_synonymes')
    {
        var result = '<li class="sent">';
        result += '<img src="img/chatbot.png" alt="" />';
        result += "<p> Les recherches de synonymes / mots apparentés sont désactivées en français pour cause de manque de ressources sur le DBPEDIA français </p>";
        result += "</li>";
        var doc = document.getElementById('mess');
        doc.insertAdjacentHTML('beforeend', result);
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
        result += "Pas de définition trouvée pour ce mot... Vérifiez l'ortographe ou essayez avec un autre.";
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
    result += "<tr> <td> TRADUCTION </td> <td> LANGUE </td> </tr>";
    if (jsonObj.results.bindings.length == 0)
    {
        result += "<tr><td> Pas de traductions trouvées pour ce mot... Vérifiez l'ortographe ou essayez avec un autre.</td>";
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
    // @fr:uniformisation majuscule / accents
    var lang = capitalizeFirstLetter(language);
    lang = replaceAll(lang, 'é', 'e');
    lang = replaceAll(lang, 'è', 'e');
    lang = replaceAll(lang, 'ç', 'c');
    switch(lang)
    {
        case "Allemand":
            return "de";
            break;
        case "Anglais":
            return "en";
            break;
        case "Americain":
            return "en";
            break;
        case "Japonais":
            return "ja";
            break;
        case "Arabe":
            return "ar";
            break;
        case "Espagnol":
            return "es";
            break;
        case "Francais":
            return "fr";
            break;
        case "Italien":
            return "it";
            break;
        case "Neerlandais":
            return "nl";
            break;
        case "Polonais":
            return "pl";
            break;
        case "Portugais":
            return "pt";
            break;
        case "Russe":
            return "ru";
            break;
        case "Chinois":
            return "zh";
            break;
        case "Coreen":
            return "ko";
            break;
        case "Catalan":
            return "ca";
            break;
        case "Basque":
            return "eu";
            break;
        case "Bulgare":
            return "bg";
            break;
        case "Indonesien":
            return "id";
            break;
        case "Turc":
            return "tr";
            break;
        case "Tcheque":
            return "cs";
            break;
        case "Hongrois":
            return "hu";
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
            return "Allemand";
            break;
        case "en":
            return "Anglais";
            break;
        case "ja":
            return "Japonais";
            break;
        case "ar":
            return "Arabe";
            break;
        case "es":
            return "Espagnol";
            break;
        case "fr":
            return "Français";
            break;
        case "it":
            return "Italien";
            break;
        case "nl":
            return "Néerlandais";
            break;
        case "pl":
            return "Polonais";
            break;
        case "pt":
            return "Portugais";
            break;
        case "ru":
            return "Russe";
            break;
        case "zh":
            return "Chinois";
            break;
        case "ko":
            return "Coréen";
            break;
        case "ca":
            return "Catalan";
            break;
        case "eu":
            return "Basque";
            break;
        case "bg":
            return "Bulgare";
            break;
        case "id":
            return "Indonésien";
            break;
        case "tr":
            return "Turc";
            break;
        case "cs":
            return "Tchèque";
            break;
        case "hu":
            return "Hongrois";
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
                result += "<p> Voudriez-vous que je définisse un autre mot ? </p>";
                break;
            case 2:
                result += "<p> Cela semble compliqué... </p>";
                break;
            case 3:
                result += "<p> Vous pouvez également me demander des traductions de mots !  ;) </p>";
                break;
            case 4:
                result += "<p> Dites-moi que vous avez appris quelque chose ! </p>";
                break;
            case 5:
                result += "<p> Cela me paraît tellement simple... Je sais tout ! </p>";
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
                result += "<p> Je sais tellement de choses :p. </p>";
                break;
            case 2:
                result += "<p> Vous allez apprendre du nouveau vocabulaire grâce à moi ! </p>";
                break;
            case 3:
                result += "<p> Ces languages sont tellement faciles pour moi... Allez-y, demandez-moi quelque chose ! ;D </p>";
                break;
            case 4:
                result += "<p> Je pourrais être interprète. </p>";
                break;
            case 5:
                result += "<p> Vous pouvez aussi me demander des définitions ! </p>";
                break;
        }
        result += "</li>";
        var doc = document.getElementById('mess');
        doc.insertAdjacentHTML('beforeend', result);
    }
}
