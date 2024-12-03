Tasks:
- fix starving
- add first sounds?
    - do i download sounds from the interner or create them myself
        - internet:
            - a lot of free sounds available
            - maybe hard to get all sounds witht he same "vibe", like belonging to the same game?
        - doing myself
            - does maybe not sound good?
            - all has the same vibe as done by myself?
    - idea: start with sounds by myself. can consider them placeholders, can be easily replaced with new sound files
        - if my own voiced sound is to bad, i can take a placeholder sound from the internet
    - how does sound...
        - work on higher speeds 
            - if sound can be speed up, play until some speed cap. 
            - if speed faster, play speed up sound
        - How does sound work if i am zoomed in or out
            - volume depends on zoom level. Play louder if close to "sound source"
            - sounds have loudness: higher value -> can be heared from further away
        - if i have a lot of citizens doing stuff, too many sound could play
            - i can only see many citizen on certain zoom level. And on high zoom level sounds might be no longer played
        - on automated tests
            - prevent sounds from playing if running in the background
    - required sounds
        - tree cutting
        - tree falling
        - hammer sound
            - building construction
            - repairing
        - dog sounds when interacting
        - sleep sound
- more images+animations
    - trading animation
        - money image
        - after successfull "negotiation" do "trade"
        - on trade move money and item between citizens
            - successfull trade steps
                - customer put money on counter for marketCitizen
                - and takes item from market inventory
                - marketCitizen takes money from counter into own inventory

            - currently market trade does money + items at the same time. But it should happen separately, so customer can take without paying or leave forgetting to take items after paying
            - currently happes instantly and code relies on it, which makes it hard to put animation between
            - item or money move should have some generall code
            - "setStatePutMoney" from citizen to building (counter) of market.
                - animate
                - marketCitizen takes from counter into his inventory
            - "setStateTradeItem" from citizen to citizen
                - animate
            - 
- refactor "need food", "need starving"
    - not using new state stack properly?

- selecting click should select closest not first
- mushroom pickup behavior
    - vision radius different for night and day
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
    - hungry citizen visualized
    - starving citizen visualization
    - sleepy

---------------------------------------------------
Tasks done today:
- don't move directly to the middle
    - lumberjack walks besides tree
- eating animation
    - stay still
    - one image paws up to mouth
    - paint mushroom in hands over mouth
    - takes one second to eat
- repairing should take time


--------------------------------------------------
Big Idea:
- do some game for chatters.
    - chatter can play something while i do coding
    - chatter are "just" audiance and can emote somehow
        - think about simple options
        - command "throw ball"
    - chatter are a type of input for a game i build
        - idea: chatSim
            next vision step:
                first chat interactions
                - "citizen traits"
                    - something which makes citizen behave differently. Which can be modified by chatters
                        - like trait: "earlybird", wakes up early
                        - trait "nightowl". goes to bed late
                -  chatter can input dream job
                    - dream job will be saved. Citizen will do this job if possible
                    - dream job could be something not yet implemented as a way for me to see what i could implement in the future                    
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


