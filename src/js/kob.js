(function(){

    var backend = "php/backend.php";
    var routing_rules = {};
    var hash;

    function bootstrap()
    {
        routing_rules = JSON.parse(document.querySelector("#routing_rules").innerHTML);
        window.addEventListener('hashchange', routingHandler, false);
        routingHandler();
    }

    function routingHandler()
    {
        hash = document.location.hash.replace("#","");
        if(!hash.length || !hash)
        {
            document.location.hash = routing_rules.home.hash;
            return;
        }

        var rule = null, r, route, idx_param, indexed_parameters;
        for(var i in routing_rules)
        {
            if(!routing_rules.hasOwnProperty(i))
                continue;
            r = routing_rules[i];

            r.parameters = r.parameters || {};

            route = r.hash.replace('\/', '\\/').replace('.', '\.');
            indexed_parameters = [];
            idx_param = 0;
            for(var name in r.parameters)
            {
                if(!r.parameters.hasOwnProperty(name))
                    continue;

                var re = new RegExp('\\{\\$'+name+'\\}');
                if(!re.test(route))
                    continue;

                indexed_parameters[++idx_param] = name;
                route = route.replace(re, '('+ r.parameters[name]+')');
            }

            var re_route = new RegExp("^"+route+"$");
            if(!re_route.test(hash))
                continue;

            var matches = hash.match(re_route);
            var parameters = [];
            for(var k = 1, maxk = matches.length; k<maxk; k++)
            {
                parameters[indexed_parameters[k]] = matches[k];
            }
            rule = r;
        }

        if(rule != null)
        {
            executeContext(rule.controller, rule.action, parameters);
        }
        else
        {
            console.log("nothing here bro");
        }
    }

    function executeContext(pController, pAction, pParameters)
    {
        pController = pController||"Index";
        pAction = pAction||"defaultAction";
        pParameters = pParameters||{};


        var ins = new ctrl[pController]();
        ins.setTemplate(pController, pAction);
        ins[pAction](pParameters);
    }

    function DefaultController()
    {
        this.removeAllEventListener();
        this.template = "";
        this.content = {};
        this.addEventListener('render', this.render.proxy(this), false);
        document.querySelector('body').classList.add('loading');
    }

    Class.define(DefaultController, [EventDispatcher], {
        render:function()
        {
            var ref = this;
            var tpl = new Template(this.template);
            tpl.addEventListener(TemplateEvent.RENDER_COMPLETE, function(){
                document.querySelector('body').classList.remove('loading');
                ref.dispatchEvent(new Event(TemplateEvent.RENDER_COMPLETE));
            }, false);
            tpl.assign('content', this.content);
            document.querySelector('#container').innerHTML = "";
            tpl.render(document.querySelector('#container'));
        },
        setTemplate:function(pController, pAction, pName)
        {
            if(!pController && !pAction)
            {
                this.template = pName;
                return;
            }
            this.template = [pController, pAction, "tpl"].join("_");

        },
        addContent:function(pName, pValue)
        {
            this.content[pName] = pValue;
        }

    });

    var ctrl = {};

    ctrl.Index = function()
    {
        this.super();
    };

    Class.define(ctrl.Index, [DefaultController], {
        defaultAction:function()
        {

            var r = Math.round(Math.random()*10000);
            var ref = this;
            Request.load(backend, {'action':'getResults'}, 'POST').onComplete(function(pResponse){
                var results = pResponse.responseJSON;
                ref.addContent('results', results);

                Request.load('data/kob.json?'+r).onComplete(function(pResponse)
                {
                    var players = pResponse.responseJSON;

                    for(var i = 0, max = players.length;i<max;i++)
                    {
                        players[i].avgPts = Math.round((players[i].pts/players[i].played)*10)/10;
                        if(isNaN(players[i].avgPts))
                            players[i].avgPts = 0;
                        players[i].avgWin = Math.round((players[i].win/players[i].played)*100);
                    }

                    var classement = ['pp', 'diff'];

                    players.sort(function(pA, pB){

                        for(var i in classement)
                        {
                            if(!classement.hasOwnProperty(i))
                                continue;
                            var prop = classement[i];
                            if (pA[prop]>pB[prop])
                                return -1;
                            else if (pA[prop]<pB[prop])
                                return 1;
                        }
                        return 0;
                    });

                    for(i = 0, max = players.length; i<max; i++)
                    {
                        players[i].position = i+1;
                    }

                    ref.addContent('players', players);
                    ref.dispatchEvent(new Event('render'));
                });
            });

        },
        addPlayer:function()
        {
            this.addEventListener(TemplateEvent.RENDER_COMPLETE, function(e){
                addPlayer.init();
            });
            this.dispatchEvent(new Event('render'));
        },
        addResults:function()
        {
            var ref = this;
            this.addEventListener(TemplateEvent.RENDER_COMPLETE, function(e){
                addResults.init();
            });

            var r = Math.round(Math.random()*10000);

            Request.load('data/kob.json?'+r).onComplete(function(pResponse) {
                var players = pResponse.responseJSON;
                ref.addContent('players', players);
                ref.dispatchEvent(new Event('render'));
            });
        },
        deletePlayer:function(pParameters)
        {
            pParameters = pParameters || {};
            Request.load(backend, {action:'deletePlayer', 'player_id':pParameters.id}, 'POST').onComplete(function(){
                document.location.hash = "home";
            });
        },
        deleteResult:function(pParameters)
        {
            pParameters = pParameters || {};
            Request.load(backend, {action:'deleteResult', 'result_id':pParameters.id}, 'POST').onComplete(function(){
                document.location.hash = "home";
            });
        }
    });

    var addPlayer = {
        init:function()
        {
            document.querySelector('form').addEventListener('submit', function(e){
                e.stopImmediatePropagation();
                e.preventDefault();
                e.stopPropagation();
                if(document.querySelector('#name_player').value && document.querySelector('#name_player').value != "")
                {
                    Request.load(backend, {action:"addPlayer", name:document.querySelector('#name_player').value}, 'POST').onComplete(function(){
                        document.location.hash = "home";
                    });
                }
            });
        }
    };

    var addResults = {
        init:function()
        {
            document.querySelector('form').addEventListener('submit', function(e){
                e.stopImmediatePropagation();
                e.preventDefault();
                e.stopPropagation();

                var dataToCheck = ["p1", "p2", "p3", "p4", "score1", "score2"];

                var params = {"action":"addResults"};

                var id;
                for(var i in dataToCheck)
                {
                    if(!dataToCheck.hasOwnProperty(i))
                        continue;
                    id = "#"+dataToCheck[i];
                    if(!document.querySelector(id) || !document.querySelector(id).value)
                        return;

                    params[dataToCheck[i]] = document.querySelector(id).value;
                }

                var p = [];
                for(var k = 1, max = 5; k<max; k++) {
                    if (p.indexOf(params["p" + k]) === -1)
                        p.push(params["p" + k]);
                }

                if(p.length!=4)
                    return;

                Request.load(backend, params, 'post').onComplete(function(){
                    document.location.hash = "home";
                });
            });
        }
    };


    window.addEventListener('load', bootstrap, false);
})();