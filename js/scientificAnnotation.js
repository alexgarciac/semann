/**
This file is the main entry point for this tools for all the event
 that need to perform.

@authors : A Q M Saiful Islam, Jaana Takis
@dependency:
 {
    sparql.js
    sparqlResponseParser.js
    highlight.js
    dbLookup.js
    dataCubeSparql.js
    applicationSettings.js
    messageHandler.js
    progressbar.js
 }
 */
"use strict";
var scientificAnnotation  = {

    DEBUG: true, //determines whether to log to console window
    //initialised under init()
    BTN_PANEL: null,
    BTN_ADD: null,
    BTN_RECOMMENDER: null,
    BTN_ANNOTATIONS: null,
    BTN_TABLE: null,
    BTN_SELECT_TEXT: null,
    INPUT_SUBJECT: null,
    INPUT_PROPERTY: null,
    INPUT_OBJECT: null,
    DIV_VIEWER: null,
    DIV_ANNOTATIONS: null,
    DIV_ANNOTATION_INPUTS: null,
    DIV_ADDED: null,
    DIV_SUBJECTS: null,
    DIV_OBJECTS: null,
    DIV_RECOMMENDER: null,
    DIV_TRIPLES: null,
    DIV_DATACUBES: null,
    DIV_DRAWING: null,
    DIV_DRAWING_SUBJECT: null,
    DIV_DRAWING_OBJECT: null,
    DIV_DRAWING_PROPERTY: null,
    DIV_DRAWING_ARROW: null,
    isObjectSelection: false,
    destroyLastSelection: true,
    pageLengths: [],
    
    
    /**
     * bind the click event for buttons
     *
     * @return void
     */
    bindClickEventForButtons: function () {

        scientificAnnotation.BTN_PANEL.bind("click", function () {
            highlight.destroyActiveSelection();
            scientificAnnotation.resetSimpleAnnotatePanel($(this));
        });

        scientificAnnotation.BTN_ADD.bind("click", function () {
            highlight.destroyActiveSelection();
            scientificAnnotation.addAnnotation();
        });

        scientificAnnotation.BTN_RECOMMENDER.bind("click", function () {
            highlight.destroyActiveSelection();
            scientificAnnotation.showSimilarSearchResult();
        });

        scientificAnnotation.BTN_ANNOTATIONS.bind("click", function () {
            highlight.destroyActiveSelection();
            scientificAnnotation.fetchDataFromDatabase();
        });

        scientificAnnotation.BTN_TABLE.bind("click", function () {
            highlight.destroyActiveSelection();
            if (scientificAnnotation.DIV_ANNOTATIONS.is(':visible')) scientificAnnotation.DIV_ANNOTATIONS.hide();
            scientificAnnotation.annotateTable($(this));
        });
        
        scientificAnnotation.BTN_RESET.bind("click", function () {
            highlight.destroyActiveSelection();
            scientificAnnotation.resetAnnotation($(this));
        });
        
        scientificAnnotation.BTN_SELECT_TEXT.bind("click", function () {
            highlight.destroyActiveSelection();
            scientificAnnotation.isObjectSelection = true;
        });
        
        scientificAnnotation.DIV_DRAWING.bind("click", function () {
            if (scientificAnnotation.DEBUG) console.log("Triple view: \n" +JSON.stringify(sparql.triple, null, 4));
        });
        
    },

    /**
     * bind events for input fields
     *
     * @return void
     */
    bindEventForInputs: function () {
        
        scientificAnnotation.INPUT_SUBJECT.bind("change", function () {
            sparql.triple.set($(this));
            var myrequest = dbLookup.makeAjaxRequest($(this).val());
            myrequest.done( function(response) {
                dbLookup.dbSubjectResponse = response;
                var message = dbLookup.formatResponse(response, scientificAnnotation.DIV_SUBJECTS);
                if (message) {
                    messageHandler.displayInfo(message, scientificAnnotation.DIV_SUBJECTS);
                } else {
                    messageHandler.displayInfo("No matches found in DBpedia.org.", scientificAnnotation.DIV_SUBJECTS, true);
                }
            });
        });

        scientificAnnotation.INPUT_OBJECT.bind("change", function () {
            sparql.triple.set($(this));
            var myrequest = dbLookup.makeAjaxRequest($(this).val());
            myrequest.done( function(response) {
                dbLookup.dbObjectResponse = response;
                var message = dbLookup.formatResponse(response, scientificAnnotation.DIV_OBJECTS);
                if (message) {
                    messageHandler.displayInfo(message, scientificAnnotation.DIV_OBJECTS);
                } else {
                    messageHandler.displayInfo("No matches found in DBpedia.org.", scientificAnnotation.DIV_OBJECTS, true);
                }
            });
        });
    },

    /**
     * reset the simple annotate panel
     * @param button for which to change text
     */
    resetSimpleAnnotatePanel : function (button) {
        sparql.triple.emptyAll();
        scientificAnnotation.DIV_SUBJECTS.hide();
        scientificAnnotation.DIV_OBJECTS.hide();
        scientificAnnotation.clearAnnotationDisplayPanel();
        scientificAnnotation.resetAnnotationTable();
        var panel = scientificAnnotation.DIV_ANNOTATIONS;
        if (!panel.is(':visible')) {
            panel.fadeIn(500);
        }
    },

    /**
     * Set auto compute data for a given input field
     *
     * @param {Array of objects} containing query results for a requested resource (eg. properties)
     * @param {Object} input field  where to output the list of values
     * @return {String} URI of the user's selection
     *
     */
    setAutoComputeDataForField :function(resources, inputObject){
        inputObject.typeahead('destroy');
        inputObject.typeahead(
		{
			local: resources
		}
        ).on('typeahead:selected', function(event, data) { //triggers when user selects an item from the list
            sparql.triple.set(inputObject, data.uri);
            return data.uri; //return resource URI
        });
    },

    /**
     * Set similar search result
     *
     * @param searchResult
     * @param {Object} element where to display the recommendations
     * @return void
     */
    setSimilarSearchResult :function(searchResult, targetObject){
        if(searchResult.length > 0) {
            targetObject.empty();
            for(var i = 0; i < searchResult.length; i++) {
                targetObject.append('<a href="'+searchResult[i]+'" class="list-group-item">'+searchResult[i]+'</a>');
            }
            targetObject.fadeIn(500);// show the result
        }
    },

    /**
     * bind mouse event for click in the page for select the document
     *
     * @return void
     */
    bindEventsForPDF: function () {
        scientificAnnotation.DIV_VIEWER.bind("mouseup", function () {
            var targetElement;
            var hideElement;
            if (scientificAnnotation.isObjectSelection) {
                targetElement = scientificAnnotation.INPUT_OBJECT;
            } else {
                targetElement = scientificAnnotation.INPUT_SUBJECT;
                hideElement = scientificAnnotation.DIV_OBJECTS;
            }
            var proceed = highlight.isSelectionInPDF();
            if (proceed) {
                var text=scientificAnnotation.getSelectedTextFromPDF();
                if (text && scientificAnnotation.DIV_ANNOTATIONS.is(':visible')) {
                    targetElement.val(text);
                    sparql.triple.set(targetElement);
                    sparql.triple.setInfo(targetElement, highlight.rangy_serialize());
                    targetElement.change(); //trigger change event
                    if (hideElement) hideElement.hide();
                }
            }
            scientificAnnotation.isObjectSelection = false;
        });
        
        scientificAnnotation.DIV_VIEWER.bind("mousedown", function () {
            if (!scientificAnnotation.isObjectSelection) {
                scientificAnnotation.resetSimpleAnnotatePanel();
            }
            if (scientificAnnotation.destroyLastSelection && highlight.userHighlightRanges.length > 0) {
                var lastSelectedRange = highlight.userHighlightRanges[highlight.userHighlightRanges.length-1];
                if (lastSelectedRange) {
                    highlight.undoRangeHighlight(lastSelectedRange);
                }
                highlight.userHighlightRanges.pop();
            } else {
                scientificAnnotation.destroyLastSelection = true;
            }
        });
        
    },

    /**
     * bind the mouse click event in the given element for table rows to
     * highlight the subject part in the whole document
     * @param {Object} element under which a table is contained that needs clickable rows.
     * @return void
     */
    bindAnnotationTableSubjectClickEvent: function (targetObject) {
        var table = targetObject.find("table:first"); 
        table.on('click', 'tr', function() {
            var subject = this.cells[0];  // the first <td>
            subject = subject.innerHTML
            if(subject) {
                PDFFindBar.searchAndHighlight(subject); //PDF.js method. 
                alert('This native highlighting should be replaced with rangy methods, otherwise it corrupts the rangy highlights.');
            }
        });
    },

    /**
     * clear the values of input text field
     * @return void
     */
    clearInputField:function (){
        sparql.triple.empty(scientificAnnotation.INPUT_PROPERTY);
        sparql.triple.empty(scientificAnnotation.INPUT_OBJECT);
        //we leave subject as is in case user wants to add more statements about it
        scientificAnnotation.DIV_OBJECTS.hide();
    },

    /**
     * Get the selected text form pdf doc
     * @returns {string}
     */
    getSelectedTextFromPDF : function(){
        var text = highlight.fixWhitespace();
        var annotationInputs = $('#'+scientificAnnotation.DIV_ANNOTATION_INPUTS.prop("id")+' :input'); //retrieves all input elements
        if (text.length == 0 ) { //no text was selected
            annotationInputs.prop('disabled', true);
        } else {
            annotationInputs.prop('disabled', false);
        }
        return text;
    },

    /**
     * perform the adding of annotation
     * @return void
     */
    addAnnotation:function(){
        scientificAnnotation.hideAnnotationDisplayTable();
        sparql.triple.set(scientificAnnotation.INPUT_SUBJECT, sparql.triple.subject.uri);
        sparql.triple.set(scientificAnnotation.INPUT_PROPERTY, sparql.triple.property.uri);
        sparql.triple.set(scientificAnnotation.INPUT_OBJECT, sparql.triple.object.uri);
        var hasMissingValues = (!scientificAnnotation.INPUT_SUBJECT.val() || !scientificAnnotation.INPUT_PROPERTY.val() || !scientificAnnotation.INPUT_OBJECT.val()) ? true : false;
        if(hasMissingValues) {
            messageHandler.showErrorMessage('Empty fields. Please provide values and try again',true);
            if (scientificAnnotation.DEBUG) console.error('Empty fields. Please provide values and try again');
        } else {
            var query = sparql.insertQuery();
            var myrequest = sparql.makeAjaxRequest(query);
            myrequest.done( function(response) {
                messageHandler.showSuccessMessage('Annotation successfully added');
                scientificAnnotation.destroyLastSelection = false;
                scientificAnnotation.appendAnnotationInDisplayPanel();
                scientificAnnotation.clearInputField();
                scientificAnnotation.refreshProperties();
            });
            
        }
    },

    /**
     * Show the added annotation of the document
     * @return void
     */
    appendAnnotationInDisplayPanel : function (){
        var subject = sparql.triple.subject.label;
        var property = sparql.triple.property.label;
        var object = sparql.triple.object.label;
        //add links where possible
        if (sparql.triple.subject.uri) {
            subject = '<a href="'+sparql.triple.subject.uri+'" target="_blank">' + subject + '</a>';
        }
        if (sparql.triple.property.uri) {
            property = '<a href="'+sparql.triple.property.uri+'" target="_blank">' + property + '</a>';
        }
        if (sparql.triple.object.uri) {
            object = '<a href="'+sparql.triple.object.uri+'" target="_blank">' + object + '</a>';
        }
        scientificAnnotation.clearAnnotationDisplayPanel();
        scientificAnnotation.DIV_ADDED.append(
                '<p><strong>Subject:</strong><br/>'+subject+'</p>' +
                '<p><strong>Property:</strong><br/>'+property+'</p>' +
                '<p><strong>Object:</strong><br/>'+object+'</p><br/>'
        );
    },

    /**
     *  Reset and refresh necessary parameter and variable once new pdf file has been laoded
     */
    refreshOnNewPdfFileLoad : function () {
        tableAnnotator.TABLE_ANNOTATION_COUNT = 1;
        scientificAnnotation.clearSimilarSearchResult();
        highlight.importedAnnotations.emptyAll(); //reset imported annotations
        highlight.init();
        scientificAnnotation.resetSimpleAnnotatePanel();
    },
    
    /**
     * Reset the annotation display tables, used by viewer.js
     * @return void
     */
    resetAnnotationTable:function (){
        scientificAnnotation.DIV_TRIPLES.empty();
    },
    
    /**
     * clear available annotations
     */
    clearAnnotationDisplayPanel:function (){
        scientificAnnotation.DIV_ADDED.empty();
    },

    /**
     * clear the similar search window and hide
     */
    clearSimilarSearchResult:function(){
        scientificAnnotation.DIV_RECOMMENDER.empty();
        scientificAnnotation.DIV_RECOMMENDER.fadeOut(300);
    },

    /**
     * Show the added annotation of the document from spaql
     * @param {String} property label
     * @param {String} subject label
     * @param {String} object label
     * @return void
     */
    addDataToSparqlTableView : function (subjectValue, propertyValue, objectValue){
        var tablerow = scientificAnnotation.DIV_TRIPLES.find("table:first tr:last"); 
        tablerow.after(
            '<tr>' +
                '<td>'+subjectValue+'</td>' +
                '<td>'+propertyValue+'</td>' +
                '<td>'+objectValue+'</td>' +
            '</tr>'
        );
    },

    /**
     * Showing the available annotation tables
     * @return void
     */
    displayAvailableAnnotationFromSparql:function(){
        scientificAnnotation.clearAnnotationDisplayPanel();
        var htmlTemplate = "<p>Available annotations for this file:</p>" +'\n'+
                                    "<div id='displaySparqlTableRows' style='overflow:auto; width:800px; height:300px;'>" +'\n'+
                                        "<table id='sparqlTable' width='100%'>" +'\n'+
                                            "<tbody>" +'\n'+
                                                "<tr>" +'\n'+
                                                    "<th width='50%'> Subject </th>" +'\n'+
                                                    "<th width='20%'> Property </th>" +'\n'+
                                                    "<th width='30%'> Object </th>" +'\n'+
                                                "</tr>" +'\n'+
                                            "</tbody>" +'\n'+
                                        "</table>" +'\n'+
                                    "</div>";
        scientificAnnotation.DIV_TRIPLES.html(htmlTemplate);
        scientificAnnotation.bindAnnotationTableSubjectClickEvent(scientificAnnotation.DIV_TRIPLES);
    },

    /**
     * Hide the available annotation table
     * @return void
     */
    hideAnnotationDisplayTable:function(){
        scientificAnnotation.DIV_TRIPLES.hide();
    },

    /**
     * Fetch the data from database
     * @return void
     */
    fetchDataFromDatabase : function () {
        scientificAnnotation.clearSimilarSearchResult();
        var myrequest = sparql.makeAjaxRequest(sparql.selectTriplesQuery);
        myrequest.done( function(response) {
            if( response && response.results.bindings.length >0) {
                highlight.undoMyHighlights(highlight.userHighlightRanges); //active highlights off so the DOM will not corrupt
                scientificAnnotation.displayAvailableAnnotationFromSparql();
                scientificAnnotation.DIV_TRIPLES.fadeIn(500);
                sparqlResponseParser.parseResponse(response);
                scientificAnnotation.renderAnnotatedPage();
            } else {
                messageHandler.showWarningMessage('No available annotations found for this file.');
            }
        });
    },

    /**
     * Renders a page with annotations on it.  Picks the first page it finds.
     * @return void
     */
    renderAnnotatedPage : function () {
        var isLoading = false;
        var pageHighlights;
        $.each(PDFView.pages, function(index, page) {
            pageHighlights = highlight.importedAnnotations.get(page.id);
            if (pageHighlights) { //annotations exist for this page
                isLoading = scientificAnnotation.renderPage(page.id); //render page if needed
                if (isLoading) return false; //break loop, rendering started and multiple asynchronous calls are not allowed here.
            }
        });
        if (!isLoading) { //all pages with annotations are now rendered
            //apply missing highlights to pages that were already rendered
            $.each(PDFView.pages, function(index, page) {
                pageHighlights = highlight.importedAnnotations.get(page.id);
                if (pageHighlights) { //annotations exist for this page
                    highlight.rangy_highlight(pageHighlights);
                    highlight.importedAnnotations.empty(page.id); //now that highlight is applied, we can discard this
                }
            });
        }
    },
    
    /**
     * Renders a given page's view in PDF.js. When the page is successfully rendered, the 'pagerender' event is thrown.
     * @param {Integer} page number.
     * @return {Boolean} true if rendering was necessary, false if page was already rendered.
     */
    renderPage: function (pageNum) {  
        PDFJS.disableWorker = true;
        var page = PDFView.pages[pageNum-1];
        if (PDFView.isViewFinished(page)) { //don't do anything if page is already rendered
            return false;
        } else {
            if (scientificAnnotation.DEBUG) console.log("Rendering page["+page.id+"] state: "+page.renderingState);
            PDFView.renderView(page, "page"); //throws 'pagerender' event when done
            return true;
        }
    },
    
    /**
     * Finds the length of text per page. Values are cumulative and are assigned to the global array and are assigned asynchronously
     *
     * @return void
     */
    
    countPageLengths: function () {
        var pageTotal = PDFView.pages.length;
        scientificAnnotation.pageLengths = [];
        var str = "";
        for (var j = 1; j <= pageTotal; j++) {
            var page = PDFView.getPage(j);
            var processPageText = function processPageText(pageIndex) {
                return function(pageData, content) {
                    return function(text) {
                        for (var i = 0; i < text.bidiTexts.length; i++) {
                            str += text.bidiTexts[i].str;
                        }
                        scientificAnnotation.pageLengths.push(str.length);
                        //if (scientificAnnotation.DEBUG) console.log("Cumulative page length = "+str.length);
                    }
                }
            }(j);
            var processPage = function processPage(pageData) {
                var content = pageData.getTextContent();
                content.then(processPageText(pageData, content));
            }
            page.then(processPage);
        }
    },
    
    /**
     *  Annotate tabular structure in pdf file
     *  @return void
     */
    annotateTable : function(button) {

        if (!scientificAnnotation.DIV_DATACUBES.is(':visible')) {
            tableAnnotator.annotateSelectedTable();
        } else {
            button.text('Annotate table');
            scientificAnnotation.BTN_RESET.hide();
            scientificAnnotation.DIV_DATACUBES.hide();

            if (tableAnnotator.storedData !== null) {
                dataCubeSparql.addAnnotation(tableAnnotator.storedData);
            }
        }
    },
    
    resetAnnotation : function(button) {
        scientificAnnotation.DIV_DATACUBES.empty();
        scientificAnnotation.DIV_DATACUBES.hide();
        scientificAnnotation.BTN_TABLE.text('Annotate table');
        tableAnnotator.storedData = null;
        button.hide();
    },
    
    /**
     * Display similar search
     * @return void
     */
    showSimilarSearchResult:function(){
        scientificAnnotation.hideAnnotationDisplayTable();
        if (scientificAnnotation.DIV_RECOMMENDER.is(':visible')) {
            scientificAnnotation.DIV_RECOMMENDER.fadeOut(300);
        }
        var myrequest = sparql.makeAjaxRequest(sparql.selectRecommendationsQuery);
        myrequest.done( function(response) {
            if( response && response.results.bindings.length >0) {
                var recommendations = sparqlResponseParser.parseSimilarSearch(response);
                scientificAnnotation.setSimilarSearchResult(recommendations, scientificAnnotation.DIV_RECOMMENDER);
            } else {
                messageHandler.showWarningMessage('No recommendations exist for this document.');
            }
        });
        
    },
    
    /**
     * This sets up event listeners
     * @return void
     */
    bindEventListeners: function(){
        //An event that is fired by PDF.js when the pdf loads. 
        window.addEventListener("documentload", function(evt) {
            scientificAnnotation.refreshOnNewPdfFileLoad();
            messageHandler.showWarningMessage("Please select some text in the PDF.")
            scientificAnnotation.countPageLengths();
        }, false);
        
        //An event that is fired by PDF.js when the page is rendered (loaded).
        window.addEventListener("pagerender", function(evt) {
            var pageHighlights = highlight.importedAnnotations.get(evt.detail.pageNumber);
            if (pageHighlights) { //apply highlights on the rendered page
                highlight.rangy_highlight(pageHighlights);
                highlight.importedAnnotations.empty(evt.detail.pageNumber); //now that highlight is applied, we can discard this
            }
            scientificAnnotation.renderAnnotatedPage(); //see if more pages need to be rendered
        }, false);
        
    },
    
    refreshProperties: function() {
        var refreshPropertiesRequest = sparql.makeAjaxRequest(sparql.selectDefaultPropertiesQuery());
        refreshPropertiesRequest.done( function(response) {
            var properties = sparqlResponseParser.parseResource(response);
            sparql.defaultProperties = properties;
            if (properties.length > 0) {
                scientificAnnotation.setAutoComputeDataForField(properties, scientificAnnotation.INPUT_PROPERTY);
                messageHandler.displayInfo("Refreshed "+properties.length+" properties.", scientificAnnotation.DIV_PROPERTIES, true);
            } else { 
                messageHandler.showWarningMessage("No properties were found.")
            }
        });
    },
    
    /**
     * Initialize the document
     *
     * @return void
     */
    init:function(){
        //UI
        scientificAnnotation.BTN_PANEL = $("#simpleAnnotateButton");
        scientificAnnotation.BTN_ADD = $("#addAnnotationButton");
        scientificAnnotation.BTN_RECOMMENDER = $("#showSimilarSearchButton");
        scientificAnnotation.BTN_ANNOTATIONS = $("#queryButton");
        scientificAnnotation.BTN_TABLE = $("#annotateTableButton");
        scientificAnnotation.BTN_RESET = $("#resetAnnotationButton");
        scientificAnnotation.BTN_SELECT_TEXT = $("#objectTextSelection");
        scientificAnnotation.INPUT_SUBJECT = $("#subjectValueInput");
        scientificAnnotation.INPUT_PROPERTY = $("#propertyValueInput");
        scientificAnnotation.INPUT_OBJECT = $("#objectValueInput");
        scientificAnnotation.DIV_VIEWER = $("#viewer");
        scientificAnnotation.DIV_ANNOTATIONS = $("#simpleAnnotatePanel");
        scientificAnnotation.DIV_ANNOTATION_INPUTS = $("#annotationInputArea");
        scientificAnnotation.DIV_ADDED = $("#displayAnnotationResult");
        scientificAnnotation.DIV_SUBJECTS = $("#displaySubjectURI");
        scientificAnnotation.DIV_PROPERTIES = $("#propertyCount");
        scientificAnnotation.DIV_OBJECTS = $("#displayObjectURI");
        scientificAnnotation.DIV_RECOMMENDER = $("#similarPubsList");
        scientificAnnotation.DIV_TRIPLES = $("#displayTriples");
        scientificAnnotation.DIV_DATACUBES = $("#viewSelectedInfoFromPfdTable");
        scientificAnnotation.DIV_DRAWING = $("#drawing");
        scientificAnnotation.DIV_DRAWING_SUBJECT = $("#visualSubject");
        scientificAnnotation.DIV_DRAWING_OBJECT = $("#visualObject");
        scientificAnnotation.DIV_DRAWING_PROPERTY = $("#visualProperty");
        
        messageHandler.showWarningMessage("Please open a PDF document on the left pane.")
        scientificAnnotation.bindClickEventForButtons();
        scientificAnnotation.bindEventForInputs();
        scientificAnnotation.bindEventListeners();
        scientificAnnotation.bindEventsForPDF();
        scientificAnnotation.refreshProperties();
        
    }
};

/**
 * document on ready method
 */
$(function () {
    applicationSettings.setUp();
    if (applicationSettings.isUnitTestOngoing) {
        return;
    }
    scientificAnnotation.init();
    test.init(); //functionality related to jaana developing. Remove this from production.
});