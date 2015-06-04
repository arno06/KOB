<?php
if(!isset($_POST) || !isset($_POST['action']))
{
    exit();
}

define('PLAYER_FILE', '../data/players.json');
define('RESULTS_FILE', '../data/results.json');
define('KOB_FILE', '../data/kob.json');

function generateKOBFile()
{
    $players = json_decode(file_get_contents(PLAYER_FILE), true);
    $results = json_decode(file_get_contents(RESULTS_FILE), true);

    $kob_data = array();

    foreach($players as $k=>$p)
    {
        $kob_data[] = array(
            'id'=>$k,
            'name'=>$p['name'],
            'pts'=>0,
            'played'=>0,
            'win'=>0,
            'lose'=>0,
            'pp'=>0,
            'pc'=>0,
            'diff'=>0
        );
    }

    for($i = 0, $max = count($results); $i<$max; $i++)
    {
        $r = $results[$i];

        $team1 = $r['team1'];
        $team2 = $r['team2'];

        $score1 = $r['score1'];
        $score2 = $r['score2'];

        $win = array($score1>$score2, $score2>$score1);
        $diff = array($score1-$score2, $score2-$score1);

        foreach($team1 as $p)
        {
            if(!isset($kob_data[$p]))
                continue;
            $kob_data[$p]['pts'] += $score1;
            $kob_data[$p]['played'] += 1;
            $result = $win[0]?"win":"lose";
            $kob_data[$p][$result] += 1;
            $kob_data[$p]['pp'] += $score1;
            $kob_data[$p]['pc'] += $score2;
            $kob_data[$p]['diff'] += $diff[0];
        }

        foreach($team2 as $p)
        {
            if(!isset($kob_data[$p]))
                continue;
            $kob_data[$p]['pts'] += $score2;
            $kob_data[$p]['played'] += 1;
            $result = $win[1]?"win":"lose";
            $kob_data[$p][$result] += 1;
            $kob_data[$p]['pp'] += $score2;
            $kob_data[$p]['pc'] += $score1;
            $kob_data[$p]['diff'] += $diff[1];
        }
    }

    file_put_contents(KOB_FILE, json_encode($kob_data));
}

class SimpleModel
{
    protected $fileName;
    protected $data;

    public function __construct($pFileName)
    {
        $this->fileName = $pFileName;
        if(!file_exists($this->fileName))
        {
            $this->data = array();
            $this->save();
        }
        $this->data = json_decode(file_get_contents($this->fileName), true);
    }

    public function add($pData)
    {
        $this->data[] = $pData;
    }

    public function delete($pIndex)
    {
        if(!isset($this->data[$pIndex]))
            return;
        unset($this->data[$pIndex]);
    }

    public function save()
    {
        chmod($this->fileName, 0777);
        file_put_contents($this->fileName, json_encode($this->data));
    }

    public function getData()
    {
        return $this->data;
    }
}

class Players extends SimpleModel
{
    public function __construct()
    {
        parent::__construct(PLAYER_FILE);
    }
}

class Results extends SimpleModel
{
    public function __construct()
    {
        parent::__construct(RESULTS_FILE);
    }

    public function deletePlayer($pIndex)
    {
        foreach($this->data as &$r)
        {
            foreach($r['team1'] as $o=>$id)
            {
                if($id == $pIndex)
                {
                    unset($r['team1'][$o]);
                }
            }
            foreach($r['team2'] as $o=>$id)
            {
                if($id == $pIndex)
                {
                    unset($r['team2'][$o]);
                }
            }
        }
    }
}


switch($_POST['action'])
{
    case "getResults":
        $resultModel = new Results();
        $playersModel = new Players();
        $results = $resultModel->getData();
        $players = $playersModel->getData();

        $results = array_reverse($results);

        $max = 5;
        $current = 0;

        $return = array();
        foreach($results as &$r)
        {
            if($current>=$max)
                continue;
            for($i = 1; $i<=2; $i++)
            {
                foreach($r['team'.$i] as $n=>$id)
                {
                    if(isset($players[$id]))
                    {
                        $r['team'.$i][$n] = $players[$id];
                    }
                }
            }
            $return[] = $r;
            $current++;
        }

        header('Content-Type:application/json');
        echo json_encode($results);
        exit();

        break;
    case "addPlayer":
        $playersModel = new Players();
        $name = $_POST['name'];
        $playersModel->add(array('name'=>$name));
        $playersModel->save();
        generateKOBFile();
        break;
    case "addResults":
        $resultModel = new Results();
        $team1 = array($_POST['p1'], $_POST['p2']);
        $team2 = array($_POST['p3'], $_POST['p4']);
        $score1 = $_POST['score1'];
        $score2 = $_POST['score2'];
        $resultModel->add(array(
            'team1'=>$team1,
            'team2'=>$team2,
            'score1'=>$score1,
            'score2'=>$score2));
        $resultModel->save();
        generateKOBFile();
        break;
    case "deletePlayer":
        $resultModel = new Results();
        $resultModel->deletePlayer($_POST['player_id']);
        $resultModel->save();
        $playersModel = new Players();
        $playersModel->delete($_POST['player_id']);
        $playersModel->save();
        generateKOBFile();
        break;
    case "deleteResult":
        $resultModel = new Results();
        $resultModel->delete($_POST['result_id']);
        $resultModel->save();
        generateKOBFile();
        break;
    default:
        exit();
}

echo "ok";
exit();