Tasks:
- more images+animations
    - thought animation
        - make thoughs usable for jobs
    - buy/sell animation
    - don't move directly to the middle
        - lumberjack walks besides tree, (left and right)
            - can not be more than two people cutting?
    - buildings in poor conditions
    - think about: inventory consitency
        - just switching jobs and the basket with mushrooms disapears. Should stay as long as mushrooms in inventory?
        - market inventory disapears if jobs swichted. Should market continue display these
            - can only change if citizen in market building
    - put planks beside buildings beeing build
    - visualize citizen transporting wood planks
    - sleeping dog image
    - death animation

    - make the map appear more realistic. Easier to follow what happens
    - make actions take time for animations to be displayed
    - visaulize interactions between citizens better
        - like a chat bubble when requesting to sell or buy
- selecting click should select closest not first
- mushroom pickup behavior
    - vision radius different for night and day
- think about: change market jobs only possible with market. Before can try to get food from other citizens
- zoom in to mouse cursor not map middle

- pathing, citizen can not move over "private property"
- job "food market"
    - if many mushrooms on stock, buy them for less
    - if low on mushrooms, sell for more
    - can eat their own mushrooms
- job "food gatherer"
    - try to sell for highest price
- chatter can fix their prices?
- citizen can decide to go buy mushrooms from food market
- streamer can set limits which citizen are not allowed to break
    - only allowed to break if they flag themselfes as criminal
- chatter blacklist?, way to remove unwanted chatters like bots

- use images
    - citizen image with move 8 directions
        - make top view image and rotate image => than just need some walking frames
    - hungry citizen visualized
    - starving citizen visualization

---------------------------------------------------
Tasks done today:
- selected citizen to the front. If many citizen thinking they can overlap their thoughts bubble. To see each one i can select citizen
- problem: citizen get to starving while thinking to much. Make starving gather a bit more food once triggered
- thought animation
    - job switch improve display text
    - make multiple lines possible
- thought animation
    - job switch
        - thought bubble
        - display text in it
        - each tought takes time to be able to follow
- map zoom only in map area and prevent default


--------------------------------------------------
Big Idea:
- do some game for chatters.
    - chatter can play something while i do coding
    - chatter are "just" audiance and can emote somehow
        - think about simple options
        - command "throw ball"
    - chatter are a type of input for a game i build
        - idea: chatSim
            start steps/MVP:
                - when new chatter writes something in chat -> add chatter as citizen to world
                    - starts with no house/food, getInitial money.Total game money limited by this?
                    - automatically search for starting job:
                        - first two jobs are for food and wood
                - automatically decides to get food if low on food
                    - if market has food -> buy it with money
                        - if no money and job-> steal food?
                    - if no food and no job -> get job for creating food like farmer
                - automatically decides to get house if no house
                    - if no house to rent available -> get job to build houses
                    - if house avaiable -> rent it
            big vision:
                - each chatter becomes a citizen of a game world
                    - moves mostly by itself but chatter can influence his citizen
                    - can die, or become successful and rich
                - i as a streamer am the god. Can set rules. 
                    - i make money from taxes. I can build stuff with my money or spend on goverment jobs
                        - income tax
                        - other taxes
                    - i can set taxes. Based on tax income i can set who gets what amount of money.
                        - teachers/schools -> research, more efficient workers
                        - police  -> to few -> more stealing/destroying
                        - firefighers -> to few -> fires might destroy houses more
                        - "health care" -> no health care -> poor people will die
                                - citizen ganes stats for everything he does. Dying meas stats are lost. 
                    - like citybuilder games: mark housing areas, shopping areas. Otherwise inhabitant will build where they want, could be bad if city grows big
                    - set area for forest replanting, so enough wood is available long term
                    - to have police i need to set taxes. Based on tax income i can employ x number of police
                        - if crime is to big, my police might not be enough. if low crime i can save on police money
                - as a chatter i can choose my "job"
                    - criminal -> steal stuff, destroy stuff
                    - police -> fight criminals
                    - medic -> heal injured
                    - farmer -> plant food
                    - go on strike -> stops working
                        - put up strike message
                - simulate resouces: the more workers gather wood, the more wood, prices for wood go down
                    - resourse have to be transported
                - game should simulate some society
                - society should work with 1 or 1000 inhabitant/chatter
                - should progress through ages/technologies
                - world starts with trees and stones and some type of forest food
                - inhabitants build town own their own
                    - cut down trees for wood -> build wood house with it
                    - gather fruits/meats for food
                    - each inhabitant can have job


