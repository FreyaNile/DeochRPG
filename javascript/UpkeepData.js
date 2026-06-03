/**
 * @module UpkeepData
 * @description Central registry for game content, including the development timeline and bestiary.
 */
export const UpkeepData = {

    THEMES: [
        'amethyst', 'crimson', 'emerald', 'abyssal', 'sapphire',
        'inferno', 'voidwalker', 'royal-gold', 'rose-quartz', 'necrotic',
        'frostbite', 'toxic', 'hybrasyl', 'phantom', 'glitch',
        'autumn', 'blizzard', 'sanguine', 'alchemist'
    ],

    BESTIARY: [
        {
            id: 'goblin',
            name: 'Goblin',
            type: 'Small Humanoid',
            icon: 'sword',
            ac: '12',
            hp: '7',
            mp: '0',
            speed: '30ft',
            summary: 'Skittish ambusher that relies on numbers and dirty tactics.',
            actions: ['Scimitar +3 to hit, 1d6+1 damage', 'Shortbow +3 to hit, 1d6+1 damage']
        },
        {
            id: 'spider',
            name: 'Spider',
            type: 'Tiny Beast',
            icon: 'bug',
            ac: '13',
            hp: '4',
            mp: '0',
            speed: '20ft, climb 20ft',
            summary: 'Venomous crawler suited for cramped spaces and surprise attacks.',
            actions: ['Bite +4 to hit, 1 damage, target checks against venom']
        },
        {
            id: 'horse',
            name: 'Horse',
            type: 'Large Beast',
            icon: 'paw-print',
            ac: '11',
            hp: '19',
            mp: '0',
            speed: '60ft',
            summary: 'Fast mount or battlefield obstacle with a strong kick.',
            actions: ['Hooves +4 to hit, 2d4+2 damage']
        }
    ]
};
